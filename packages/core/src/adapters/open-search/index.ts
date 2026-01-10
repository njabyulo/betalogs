import { Client } from '@opensearch-project/opensearch'
import {
  Bulk_RequestBody,
  Search_RequestBody,
} from '@opensearch-project/opensearch/api/index.js'
import { createEmbeddingAdapter } from '../ai-sdk'
import {
  ICreateSearchAdapterOptions,
  IEmbeddingAdapter,
  IFieldMappingConfig,
  ISearchAdapter,
  ISearchAdapterDocChunk,
  ISearchAdapterKnnSearchArgs,
  ISearchAdapterKnnSearchResult,
  ISearchAdapterOptions,
  TSearchModelType,
} from '../interfaces'
import type { MatchQuery, QueryContainer, TermQuery } from '@opensearch-project/opensearch/api/_types/_common.query_dsl.js'
import type { FieldValue } from '@opensearch-project/opensearch/api/_types/_common.js'
import type {
  ISearchAdapterExactSearchArgs,
  ISearchAdapterExactSearchResult,
} from '../interfaces'

class SearchAdapter implements ISearchAdapter {
  private embeddingAdapter: IEmbeddingAdapter
  private client: Client
  private index: string
  private modelType: TSearchModelType
  private fieldMappingConfig: IFieldMappingConfig
  private metadataRegistryLookup?: ISearchAdapterOptions['metadataRegistryLookup']
  private registryCache: Map<string, Map<string, import('@betalogs/shared/types').TMetadataRegistryEntry>> = new Map()

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
    this.metadataRegistryLookup = options.metadataRegistryLookup

    // Set default field mapping configuration and merge with user-provided config
    const defaultConfig: IFieldMappingConfig = {
      explicit: {},
      conventions: {
        snakeCase: true,
        camelCase: true,
        kebabCase: true,
        pascalCase: true,
        metadataPaths: ['metadata'],
      },
    }

    this.fieldMappingConfig = {
      explicit: {
        ...defaultConfig.explicit,
        ...(options.fieldMapping?.explicit ?? {}),
      },
      conventions: {
        ...defaultConfig.conventions,
        ...(options.fieldMapping?.conventions ?? {}),
      },
    }

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
      const tenantId = chunk.tenantId

      // Build the document with all log information
      const document: Record<string, unknown> = {
        // Core log fields
        timestamp: chunk.timestamp,
        level: chunk.level,
        service: chunk.service,
        message: chunk.message,
        embedding: embeddings[i],

        // Always store full metadata as meta_json (safe blob)
        meta_json: metadata,

        // Always generate meta_kv array for generic exact match filters
        meta_kv: [] as string[],
      }

      // Generate meta_kv array: ["key=value", "key2=value2", ...]
      const metaKv: string[] = []
      for (const [key, value] of Object.entries(metadata)) {
        if (
          value !== null &&
          value !== undefined &&
          typeof value !== 'object' &&
          !Array.isArray(value)
        ) {
          metaKv.push(`${key}=${String(value)}`)
        }
      }
      document.meta_kv = metaKv

      // Get registry for tenant if metadataRegistryLookup is available and tenantId is provided
      let registry: Map<string, import('@betalogs/shared/types').TMetadataRegistryEntry> | undefined
      if (this.metadataRegistryLookup && tenantId) {
        // Check cache first
        if (!this.registryCache.has(tenantId)) {
          registry = await this.metadataRegistryLookup.getRegistryForTenant(tenantId)
          this.registryCache.set(tenantId, registry)
        } else {
          registry = this.registryCache.get(tenantId)
        }
      }

      // For registered keys, write to typed namespaces
      if (registry) {
        for (const [key, value] of Object.entries(metadata)) {
          const registryEntry = registry.get(key)
          if (registryEntry) {
            // Validate type and constraints if provided
            // For now, we'll do basic type checking
            let typedValue: unknown = value

            // Type conversion and validation
            try {
              switch (registryEntry.type) {
                case 'number':
                  typedValue = typeof value === 'number' ? value : Number(value)
                  if (isNaN(typedValue as number)) {
                    continue // Skip invalid numbers
                  }
                  break
                case 'date':
                  if (typeof value === 'string') {
                    const date = new Date(value)
                    if (isNaN(date.getTime())) {
                      continue // Skip invalid dates
                    }
                    typedValue = value // Keep as ISO string
                  } else if (value instanceof Date) {
                    typedValue = value.toISOString()
                  } else {
                    continue // Skip non-date values
                  }
                  break
                case 'boolean':
                  typedValue = Boolean(value)
                  break
                case 'keyword':
                case 'text':
                  typedValue = String(value)
                  break
              }

              // Write to appropriate typed namespace
              const typedKey = `${registryEntry.promoteTo}.${key}`
              document[typedKey] = typedValue
            } catch (error) {
              // Skip invalid values, continue with other keys
              continue
            }
          }
          // Unregistered keys do NOT create typed fields (prevents mapping explosion)
        }
      }

      // Keep existing flattening for backward compatibility (can be removed later if not needed)
      // Automatically flatten all top-level metadata fields (except objects/arrays) into document
      for (const [key, value] of Object.entries(metadata)) {
        if (
          value !== null &&
          value !== undefined &&
          typeof value !== 'object' &&
          !Array.isArray(value)
        ) {
          // Only flatten if not already in typed namespace
          const typedKey = `meta_num.${key}`
          const typedKey2 = `meta_date.${key}`
          const typedKey3 = `meta_bool.${key}`
          const typedKey4 = `meta_kw.${key}`
          const typedKey5 = `meta_text.${key}`
          if (
            !(typedKey in document) &&
            !(typedKey2 in document) &&
            !(typedKey3 in document) &&
            !(typedKey4 in document) &&
            !(typedKey5 in document)
          ) {
            document[key] = value
          }
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

  /**
   * Convert camelCase or PascalCase to snake_case
   * e.g., "orderId" -> "order_id", "OrderId" -> "order_id"
   */
  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
  }

  /**
   * Convert to camelCase
   * Handles inputs that are already camelCase, snake_case, kebab-case, or PascalCase
   * e.g., "orderId" -> "orderId", "order_id" -> "orderId", "order-id" -> "orderId"
   */
  private toCamelCase(str: string): string {
    // If already camelCase (starts with lowercase), return as-is
    if (/^[a-z]/.test(str) && !/[-_]/.test(str)) {
      return str
    }
    return str
      .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
      .replace(/^[A-Z]/, (char) => char.toLowerCase())
  }

  /**
   * Convert to kebab-case
   * e.g., "orderId" -> "order-id", "order_id" -> "order-id"
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^[-_]/, '')
      .replace(/[-_]/g, '-')
  }

  /**
   * Convert to PascalCase
   * e.g., "orderId" -> "OrderId", "order_id" -> "OrderId"
   */
  private toPascalCase(str: string): string {
    const camel = this.toCamelCase(str)
    return camel.charAt(0).toUpperCase() + camel.slice(1)
  }

  /**
   * Generate field paths for a given identifier type based on configuration
   */
  private generateFieldPaths(identifierType: string): string[] {
    const paths: string[] = []

    // 1. Check explicit mappings first (highest priority)
    if (this.fieldMappingConfig.explicit?.[identifierType]) {
      return this.fieldMappingConfig.explicit[identifierType]
    }

    // 2. Generate paths based on enabled conventions
    const conventions = this.fieldMappingConfig.conventions ?? {}
    const fieldNames: string[] = []

    if (conventions.snakeCase) {
      fieldNames.push(this.toSnakeCase(identifierType))
    }
    if (conventions.camelCase) {
      fieldNames.push(this.toCamelCase(identifierType))
    }
    if (conventions.kebabCase) {
      fieldNames.push(this.toKebabCase(identifierType))
    }
    if (conventions.pascalCase) {
      fieldNames.push(this.toPascalCase(identifierType))
    }

    // 3. Add root-level paths
    paths.push(...fieldNames)

    // 4. Add metadata-prefixed paths
    const metadataPaths = conventions.metadataPaths ?? []
    for (const metadataPath of metadataPaths) {
      for (const fieldName of fieldNames) {
        paths.push(`${metadataPath}.${fieldName}`)
      }
    }

    // 5. Deduplicate and return
    return [...new Set(paths)]
  }

  async exactSearch(
    args: ISearchAdapterExactSearchArgs
  ): Promise<ISearchAdapterExactSearchResult[]> {
    const { identifier, identifierType } = args

    // Generate field paths based on configuration
    const fields = this.generateFieldPaths(identifierType)

    // Build a query that searches across all possible field locations
    const shouldClauses = fields.flatMap((field) => [
      {
        term: {
          [field]: {
            value: identifier,
            case_insensitive: true,
          },
        },
      },
      {
        match: {
          [field]: {
            query: identifier,
            operator: 'and' as const,
          },
        },
      },
    ])

    const query: QueryContainer = {
      bool: {
        should: shouldClauses,
        minimum_should_match: 1,
      },
    }

    const body: Search_RequestBody = {
      size: 1000, // Get all matching events (reasonable limit)
      _source: true,
      query,
      sort: [
        {
          timestamp: {
            order: 'asc' as const,
          },
        },
      ],
    }

    const resp = await this.client.search({
      index: this.index,
      body,
    })

    const hits = (resp.body?.hits?.hits ?? []).map((h: any) => ({
      id: h._id as string,
      timestamp: h._source?.timestamp as string,
      level: h._source?.level as string,
      service: h._source?.service as string,
      message: h._source?.message as string,
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
    fieldMapping: options.fieldMapping,
  })
}
