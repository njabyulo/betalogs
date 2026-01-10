import { Client } from '@opensearch-project/opensearch'
import {
  Bulk_RequestBody,
  Search_RequestBody,
} from '@opensearch-project/opensearch/api/index.js'
import { createEmbeddingAdapter } from '../ai-sdk'
import {
  ICreateSearchAdapterOptions,
  IEmbeddingAdapter,
  ISearchAdapter,
  ISearchAdapterDocChunk,
  ISearchAdapterKnnSearchArgs,
  ISearchAdapterKnnSearchResult,
  ISearchAdapterOptions,
  TSearchModelType,
} from '../interfaces'
import type { MatchQuery, QueryContainer, TermQuery } from '@opensearch-project/opensearch/api/_types/_common.query_dsl.js'
import type { FieldValue } from '@opensearch-project/opensearch/api/_types/_common.js'

class SearchAdapter implements ISearchAdapter {
  private embeddingAdapter: IEmbeddingAdapter
  private client: Client
  private index: string
  private modelType: TSearchModelType

  constructor(options: ISearchAdapterOptions) {
    this.embeddingAdapter = options.embeddingAdapter
    this.client = new Client({
      node: options.opensearch.node,
      auth:
        options.opensearch.username && options.opensearch.password
          ? {
            username: options.opensearch.username,
            password: options.opensearch.password,
          }
          : undefined,
      ssl: { rejectUnauthorized: false },
    })

    this.index = options.opensearch.index
    this.modelType = options.modelType
    this.ensureIndex()
  }

  async ensureIndex(): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: this.index })
      if (exists.body === true) return
    } catch (error) {
      // If exists check fails, try to create anyway
    }

    try {
      await this.client.indices.create({
        index: this.index,
        body: {
          settings: {
            index: {
              knn: true,
            },
          },
          mappings: {
            properties: {
              embedding: {
                type: 'knn_vector',
                dimension: this.embeddingAdapter.getEmbeddingDimension(
                  this.modelType
                ),
              },
            },
          },
        },
      })
    } catch (error: any) {
      // Ignore "index already exists" errors (race condition or concurrent requests)
      if (
        error?.meta?.body?.error?.type !== 'resource_already_exists_exception'
      ) {
        throw error
      }
    }
  }

  async clearIndex(): Promise<void> {
    await this.client.indices.delete({ index: this.index })
  }

  async indexChunks(chunks: ISearchAdapterDocChunk[]): Promise<void> {
    if (chunks.length === 0) return

    const embeddings = await this.embeddingAdapter.embedMany({
      chunks: chunks.map((c) => c.message),
      type: this.modelType,
    })

    const body: Bulk_RequestBody = []
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!
      const metadata = chunk.metadata ?? {}

      // Build the document with all log information
      // Store full metadata object and also flatten commonly queried fields for better searchability
      const document: Record<string, unknown> = {
        // Core log fields
        timestamp: chunk.timestamp,
        level: chunk.level,
        service: chunk.service,
        message: chunk.message,
        embedding: embeddings[i],

        // Store complete metadata object (preserves all nested structure)
        metadata: metadata,
      }

      // Automatically flatten all top-level metadata fields (except objects/arrays) into document
      for (const [key, value] of Object.entries(metadata)) {
        if (
          value !== null &&
          value !== undefined &&
          typeof value !== 'object' &&
          !Array.isArray(value)
        ) {
          document[key] = value
        }
      }

      // Flatten error fields
      if (metadata.error && typeof metadata.error === 'object') {
        const error = metadata.error as Record<string, unknown>
        if (error.type) document.error_type = error.type
        if (error.code) document.error_code = error.code
        if (error.retriable !== undefined)
          document.error_retriable = error.retriable
      }

      // Flatten feature flag fields
      if (
        metadata.feature_flags &&
        typeof metadata.feature_flags === 'object'
      ) {
        const flags = metadata.feature_flags as Record<string, unknown>
        document.new_checkout_enabled = flags.new_checkout_enabled ?? false
        document.express_checkout_enabled =
          flags.express_checkout_enabled ?? false
      }

      body.push({ index: { _index: this.index, _id: chunk.id } })
      body.push(document)
    }

    const resp = await this.client.bulk({ refresh: true, body })
    if (resp.body?.errors) {
      const items = resp.body.items ?? []
      const failures = items.filter((x: any) => x.index?.error)
      throw new Error(
        `Bulk indexing had errors: ${JSON.stringify(
          failures.slice(0, 3),
          null,
          2
        )}`
      )
    }
  }

  async knnSearch(
    args: ISearchAdapterKnnSearchArgs
  ): Promise<ISearchAdapterKnnSearchResult[]> {
    const embedding = await this.embeddingAdapter.embed({
      value: args.query,
      type: this.modelType,
    })

    const k = args.k ?? 8

    // Build filter clauses from the filter parameter
    // Support filtering by flattened fields (user_id, deployment_id, etc.) and nested metadata
    const filterClauses: QueryContainer[] = []
    if (args.filter) {
      for (const [key, value] of Object.entries(args.filter)) {
        if (value !== null && value !== undefined) {
          // Support exact matches for flattened fields and nested metadata
          // Try flattened field first (e.g., user_id, deployment_id)
          // Then try nested metadata path (e.g., metadata.user_id)

          const termQuery: TermQuery = {
            value: value as FieldValue,
            case_insensitive: true,
          }
          const matchQuery: MatchQuery = {
            query: value as FieldValue,
            analyzer: 'standard',
            auto_generate_synonyms_phrase_query: true,
            cutoff_frequency: 0.001,
            fuzziness: 'AUTO',
            zero_terms_query: 'ALL',
          }
          filterClauses.push({
            bool: {
              should: [
                { term: { [key]: termQuery } },
                { term: { [`metadata.${key}`]: termQuery } },
                // Also support match for text fields
                { match: { [key]: matchQuery } },
                { match: { [`metadata.${key}`]: matchQuery } },
              ],
              minimum_should_match: 1,
            },
          })
        }
      }
    }

    // Build the query: combine KNN search with filters
    const query: QueryContainer = {
      bool: {
        must: [
          {
            knn: {
              embedding: {
                vector: embedding,
                k: filterClauses.length > 0 ? k * 3 : k, // Fetch more candidates when filtering
              },
            },
          },
        ],
      },
    }

    // Add filter clauses if any (filters are applied after KNN retrieval)
    if (filterClauses.length > 0) {
      query.bool!.filter = filterClauses
    }

    const body: Search_RequestBody = {
      size: k,
      // Return all fields including flattened ones and full metadata
      _source: true,
      query,
    }

    const resp = await this.client.search({
      index: this.index,
      body,
    })

    const hits = (resp.body?.hits?.hits ?? []).map((h: any) => ({
      id: h._id as string,
      score: h._score as number,
      text: h._source?.message as string,
      // Return the full source document so all information is available
      metadata: h._source as Record<string, unknown>,
    }))

    return hits
  }
}

export const createSearchAdapter = (options: ICreateSearchAdapterOptions) => {
  const modelType = 'high'

  const embeddingAdapter = createEmbeddingAdapter({
    options: {
      provider: 'google',
      model: {
        low: {
          model: 'gemini-embedding-001',
          dimension: 768,
        },
        medium: {
          model: 'gemini-embedding-001',
          dimension: 3072,
        },
        high: {
          model: 'gemini-embedding-001',
          dimension: 3072,
        },
      },
    },
  })

  return new SearchAdapter({
    embeddingAdapter,
    modelType,
    opensearch: options.opensearch,
  })
}
