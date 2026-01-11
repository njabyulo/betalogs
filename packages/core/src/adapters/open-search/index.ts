import { Client } from '@opensearch-project/opensearch'
import {
  Bulk_RequestBody,
  Search_RequestBody,
} from '@opensearch-project/opensearch/api/index.js'
import { createEmbeddingAdapter } from '../ai-sdk'
import {
  IActivityEventDocument,
  ICreateSearchAdapterOptions,
  IEmbeddingAdapter,
  IFieldMappingConfig,
  ISearchAdapter,
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
import { ActivityIndexDimensionMismatchError } from '../../domain/activity/ActivityIndexError'

interface ICacheEntry {
  registry: Map<string, import('@betalogs/shared/types').TMetadataRegistryEntry>
  timestamp: number
}

class SearchAdapter implements ISearchAdapter {
  private embeddingAdapter: IEmbeddingAdapter
  private client: Client
  private index: string
  private modelType: TSearchModelType
  private fieldMappingConfig: IFieldMappingConfig
  private metadataRegistryLookup?: ISearchAdapterOptions['metadataRegistryLookup']
  private registryCache: Map<string, ICacheEntry> = new Map()
  private readonly cacheTtlMs: number = 5 * 60 * 1000
  private readonly cacheMaxSize: number = 100

  constructor(options: ISearchAdapterOptions) {
    this.embeddingAdapter = options.embeddingAdapter
    const nodeUrl = new URL(options.opensearch.node)
    const isHttps = nodeUrl.protocol === 'https:'
    this.client = new Client({
      node: options.opensearch.node,
      auth:
        options.opensearch.username && options.opensearch.password
          ? {
            username: options.opensearch.username,
            password: options.opensearch.password,
          }
          : undefined,
      ...(isHttps && { ssl: { rejectUnauthorized: false } }),
    })

    this.index = options.opensearch.index
    this.modelType = options.modelType
    this.metadataRegistryLookup = options.metadataRegistryLookup

    const defaultConfig: IFieldMappingConfig = {
      explicit: {},
      conventions: {
        snakeCase: true,
        camelCase: true,
        kebabCase: true,
        pascalCase: true,
        metadataPaths: ['metadata'],
        objectPaths: ['object', 'correlation', 'actor'],
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

  /**
   * Invalidate cache entry for a specific tenant
   */
  invalidateCache(tenantId: string): void {
    this.registryCache.delete(tenantId)
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    this.registryCache.clear()
  }

  /**
   * Evict expired entries and enforce size limit using LRU strategy
   */
  private evictCacheEntries(): void {
    const now = Date.now()

    const remainingEntries: Array<[string, ICacheEntry]> = []
    for (const [tenantId, entry] of this.registryCache.entries()) {
      if (now - entry.timestamp > this.cacheTtlMs) {
        this.registryCache.delete(tenantId)
      } else {
        remainingEntries.push([tenantId, entry])
      }
    }

    if (this.registryCache.size > this.cacheMaxSize) {
      remainingEntries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      const toRemove = this.registryCache.size - this.cacheMaxSize
      for (let i = 0; i < toRemove; i++) {
        this.registryCache.delete(remainingEntries[i]![0])
      }
    }
  }

  /**
   * Get registry from cache or fetch if not available/expired
   */
  private async getRegistryForTenant(
    tenantId: string
  ): Promise<Map<string, import('@betalogs/shared/types').TMetadataRegistryEntry> | undefined> {
    if (!this.metadataRegistryLookup) {
      return undefined
    }

    this.evictCacheEntries()

    const cached = this.registryCache.get(tenantId)
    const now = Date.now()

    if (cached && now - cached.timestamp <= this.cacheTtlMs) {
      return cached.registry
    }

    const registry = await this.metadataRegistryLookup.getRegistryForTenant(tenantId)

    this.registryCache.set(tenantId, {
      registry,
      timestamp: now,
    })

    this.evictCacheEntries()

    return registry
  }

  async ensureIndex(): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: this.index })
      if (exists.body === true) return
    } catch (error) {
      // Continue to create if check fails
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

  async ensureIndexTemplate(): Promise<void> {
    const templateName = 'bl-activity-template'
    const indexPattern = 'bl-activity-*'
    const expectedDimension = this.embeddingAdapter.getEmbeddingDimension(
      this.modelType
    )

    // Check if template exists and validate dimension
    try {
      const templateResponse = await this.client.indices.getIndexTemplate({
        name: templateName,
      })

      if (templateResponse.body?.index_templates?.length > 0) {
        const template = templateResponse.body.index_templates[0]!
        const templateDef = template.index_template
        const embeddingMapping =
          templateDef?.template?.mappings?.properties?.embedding as any

        if (embeddingMapping?.dimension !== undefined) {
          const actualDimension = embeddingMapping.dimension as number
          if (actualDimension !== expectedDimension) {
            throw new ActivityIndexDimensionMismatchError(
              expectedDimension,
              actualDimension
            )
          }
        }
        return
      }
    } catch (error: any) {
      if (error instanceof ActivityIndexDimensionMismatchError) {
        throw error
      }
      if (
        error?.meta?.body?.error?.type !== 'resource_not_found_exception' &&
        error?.statusCode !== 404
      ) {
        throw error
      }
    }

    try {
      await this.client.indices.putIndexTemplate({
        name: templateName,
        body: {
          index_patterns: [indexPattern],
          template: {
            settings: {
              index: {
                knn: true,
              },
            },
            mappings: {
              properties: {
                eventId: {
                  type: 'keyword',
                },
                tenantId: {
                  type: 'keyword',
                },
                occurredAt: {
                  type: 'date',
                },
                category: {
                  type: 'keyword',
                },
                action: {
                  type: 'keyword',
                },
                outcome: {
                  type: 'keyword',
                },
                source: {
                  type: 'keyword',
                },
                schemaVersion: {
                  type: 'keyword',
                },
                title: {
                  type: 'text',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256,
                    },
                  },
                },
                summary: {
                  type: 'text',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256,
                    },
                  },
                },
                message: {
                  type: 'text',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 256,
                    },
                  },
                },
                actor: {
                  type: 'object',
                  properties: {
                    userId: {
                      type: 'keyword',
                    },
                    emailHash: {
                      type: 'keyword',
                    },
                    serviceName: {
                      type: 'keyword',
                    },
                    role: {
                      type: 'keyword',
                    },
                  },
                },
                object: {
                  type: 'object',
                  properties: {
                    orderId: {
                      type: 'keyword',
                    },
                    requestId: {
                      type: 'keyword',
                    },
                    sessionId: {
                      type: 'keyword',
                    },
                    ticketId: {
                      type: 'keyword',
                    },
                    resourceId: {
                      type: 'keyword',
                    },
                  },
                },
                correlation: {
                  type: 'object',
                  properties: {
                    traceId: {
                      type: 'keyword',
                    },
                    spanId: {
                      type: 'keyword',
                    },
                    correlationId: {
                      type: 'keyword',
                    },
                    parentEventId: {
                      type: 'keyword',
                    },
                  },
                },
                meta_json: {
                  type: 'object',
                  enabled: true,
                },
                meta_kv: {
                  type: 'keyword',
                },
                meta_num: {
                  type: 'object',
                  dynamic: 'true' as any,
                },
                meta_date: {
                  type: 'object',
                  dynamic: 'true' as any,
                  properties: {},
                },
                meta_bool: {
                  type: 'object',
                  dynamic: 'true' as any,
                },
                meta_kw: {
                  type: 'object',
                  dynamic: 'true' as any,
                },
                meta_text: {
                  type: 'object',
                  dynamic: 'true' as any,
                },
                embedding: {
                  type: 'knn_vector',
                  dimension: expectedDimension,
                },
              },
            },
          },
        },
      })
    } catch (error: any) {
      if (error?.meta?.body?.error?.type === 'illegal_argument_exception') {
        const errorMessage = error?.meta?.body?.error?.reason || ''
        if (errorMessage.includes('dimension')) {
          try {
            const templateResponse = await this.client.indices.getIndexTemplate({
              name: templateName,
            })
            if (templateResponse.body?.index_templates?.length > 0) {
              const template = templateResponse.body.index_templates[0]!
              const templateDef = template.index_template
              const embeddingMapping =
                templateDef?.template?.mappings?.properties?.embedding as any
              const actualDimension = embeddingMapping?.dimension as number
              if (actualDimension && actualDimension !== expectedDimension) {
                throw new ActivityIndexDimensionMismatchError(
                  expectedDimension,
                  actualDimension
                )
              }
            }
          } catch (checkError) {
            // Fall through to throw original error
          }
        }
      }
      throw error
    }
  }

  async clearIndex(): Promise<void> {
    await this.client.indices.delete({ index: this.index })
  }

  async indexActivityEvents(
    documents: IActivityEventDocument[],
    indexName: string
  ): Promise<void> {
    if (documents.length === 0) return

    const body: Bulk_RequestBody = []
    for (const doc of documents) {
      const metadata = doc.metadata ?? {}
      const tenantId = doc.tenantId

      const document: Record<string, unknown> = {
        eventId: doc.eventId,
        tenantId: doc.tenantId,
        occurredAt: doc.occurredAt,
        category: doc.category,
        action: doc.action,
        outcome: doc.outcome,
        source: doc.source,
        schemaVersion: doc.schemaVersion,
        embedding: doc.embedding,

        ...(doc.title !== undefined && { title: doc.title }),
        ...(doc.summary !== undefined && { summary: doc.summary }),
        ...(doc.message !== undefined && { message: doc.message }),
        ...(doc.actor && { actor: doc.actor }),
        ...(doc.object && { object: doc.object }),
        ...(doc.correlation && { correlation: doc.correlation }),

        meta_json: metadata,
        meta_kv: [] as string[],
      }

      const registry = tenantId
        ? await this.getRegistryForTenant(tenantId)
        : undefined

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

        if (registry) {
          const registryEntry = registry.get(key)
          if (registryEntry) {
            let typedValue: unknown = value

            try {
              switch (registryEntry.type) {
                case 'number':
                  typedValue = typeof value === 'number' ? value : Number(value)
                  if (isNaN(typedValue as number)) {
                    continue
                  }
                  break
                case 'date':
                  if (typeof value === 'string') {
                    const date = new Date(value)
                    if (isNaN(date.getTime())) {
                      continue
                    }
                    typedValue = value
                  } else if (value instanceof Date) {
                    typedValue = value.toISOString()
                  } else {
                    continue
                  }
                  break
                case 'boolean':
                  if (typeof value === 'boolean') {
                    typedValue = value
                  } else if (typeof value === 'string') {
                    const normalized = value.toLowerCase().trim()
                    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
                      typedValue = true
                    } else if (normalized === 'false' || normalized === '0' || normalized === 'no') {
                      typedValue = false
                    } else {
                      continue
                    }
                  } else if (typeof value === 'number') {
                    typedValue = value !== 0
                  } else {
                    continue
                  }
                  break
                case 'keyword':
                case 'text':
                  typedValue = String(value)
                  break
              }

              const typedKey = `${registryEntry.promoteTo}.${key}`
              document[typedKey] = typedValue
            } catch (error) {
              continue
            }
          }
        }
      }
      document.meta_kv = metaKv

      body.push({ index: { _index: indexName, _id: doc.eventId } })
      body.push(document)
    }

    const resp = await this.client.bulk({ refresh: true, body })
    if (resp.body?.errors) {
      const items = resp.body.items ?? []
      const failures = items.filter((x: any) => x.index?.error)
      throw new Error(
        `Bulk indexing ActivityEvents had errors: ${JSON.stringify(
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

    const filterClauses: QueryContainer[] = []
    if (args.filter) {
      for (const [key, value] of Object.entries(args.filter)) {
        if (value !== null && value !== undefined) {
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
                { match: { [key]: matchQuery } },
                { match: { [`metadata.${key}`]: matchQuery } },
              ],
              minimum_should_match: 1,
            },
          })
        }
      }
    }

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

    if (filterClauses.length > 0) {
      query.bool!.filter = filterClauses
    }

    const body: Search_RequestBody = {
      size: k,
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
    if (this.fieldMappingConfig.explicit?.[identifierType]) {
      return this.fieldMappingConfig.explicit[identifierType]
    }

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

    const pathsSet = new Set<string>(fieldNames)

    const metadataPaths = conventions.metadataPaths ?? []
    metadataPaths.forEach((metadataPath) => {
      fieldNames.forEach((fieldName) => {
        pathsSet.add(`${metadataPath}.${fieldName}`)
      })
    })

    const objectPaths = conventions.objectPaths ?? []
    objectPaths.forEach((objectPath) => {
      fieldNames.forEach((fieldName) => {
        pathsSet.add(`${objectPath}.${fieldName}`)
      })
    })

    const identifierTypeToObjectField: Record<string, string> = {
      shipmentId: 'resourceId',
    }
    const mappedFieldName = identifierTypeToObjectField[identifierType]
    if (mappedFieldName) {
      const mappedFieldNames: string[] = []
      if (conventions.camelCase) {
        mappedFieldNames.push(this.toCamelCase(mappedFieldName))
      }
      if (conventions.snakeCase) {
        mappedFieldNames.push(this.toSnakeCase(mappedFieldName))
      }
      objectPaths.forEach((objectPath) => {
        mappedFieldNames.forEach((mappedName) => {
          pathsSet.add(`${objectPath}.${mappedName}`)
        })
      })
    }

    return Array.from(pathsSet)
  }

  async exactSearch(
    args: ISearchAdapterExactSearchArgs
  ): Promise<ISearchAdapterExactSearchResult[]> {
    const { identifier, identifierType } = args

    const fields = this.generateFieldPaths(identifierType)

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
      size: 1000,
      _source: true,
      query,
      sort: [
        {
          _script: {
            type: 'number',
            script: {
              lang: 'painless',
              source: `
                if (doc['occurredAt'].size() > 0) {
                  return doc['occurredAt'].value.millis;
                } else if (doc['timestamp'].size() > 0) {
                  return doc['timestamp'].value.millis;
                } else {
                  return 0;
                }
              `,
            },
            order: 'asc' as const,
          },
        },
      ],
    }

    const searchIndices = ['bl-activity-*', this.index]

    const resp = await this.client.search({
      index: searchIndices,
      body,
    })

    const hits = (resp.body?.hits?.hits ?? []).map((h: any) => ({
      id: h._id as string,
      timestamp: (h._source?.occurredAt || h._source?.timestamp) as string,
      level: (h._source?.level || h._source?.outcome) as string,
      service: h._source?.source || h._source?.service as string,
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
