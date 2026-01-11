import { createIndexingRepository } from '../../repositories/indexing'
import { createEmbeddingAdapter } from '../../adapters/ai-sdk'
import type { TActivityEvent } from '../../domain/activity/ActivityEvent'
import type { IActivityEventDocument, TSearchModelType } from '../../adapters/interfaces'
import {
  ICreateIndexingRepositoryOptions,
  IIndexingService,
  IIndexingServiceOptions,
  IndexingRepository,
  ISearchAdapterKnnSearchArgs,
  ISearchAdapterKnnSearchResult,
} from '../interfaces'

class IndexingService implements IIndexingService {
  private indexingRepository: IndexingRepository
  private embeddingAdapter: IIndexingServiceOptions['embeddingAdapter']
  private modelType: IIndexingServiceOptions['modelType']

  constructor(options: IIndexingServiceOptions) {
    this.indexingRepository = options.indexingRepository
    this.embeddingAdapter = options.embeddingAdapter
    this.modelType = options.modelType
  }

  async ensureIndex(): Promise<void> {
    return await this.indexingRepository.ensureIndex()
  }

  async ensureIndexTemplate(): Promise<void> {
    return await this.indexingRepository.ensureIndexTemplate()
  }

  async clearIndex(): Promise<void> {
    return await this.indexingRepository.clearIndex()
  }

  async indexActivityEvents(
    events: TActivityEvent[],
    options?: {
      embeddingSource?: (event: TActivityEvent) => string
    }
  ): Promise<void> {
    if (events.length === 0) return

    const getEmbeddingSource =
      options?.embeddingSource ??
      ((event: TActivityEvent) => {
        const parts: string[] = []
        if (event.title) parts.push(event.title)
        if (event.summary) parts.push(event.summary)
        if (event.message) parts.push(event.message)

        if (parts.length === 0) {
          parts.push(event.action)
          parts.push(event.source)
        }

        return parts.join(' ')
      })

    const embeddingTexts = events.map(getEmbeddingSource)
    const embeddings = await this.embeddingAdapter.embedMany({
      chunks: embeddingTexts,
      type: this.modelType,
    })

    const documentsByDate = new Map<string, IActivityEventDocument[]>()

    for (let i = 0; i < events.length; i++) {
      const event = events[i]!
      const embedding = embeddings[i]!

      const occurredDate = new Date(event.occurredAt)
      const dateStr = occurredDate.toISOString().split('T')[0]!
      const indexName = `bl-activity-${dateStr}`

      const document: IActivityEventDocument = {
        eventId: event.eventId,
        tenantId: event.tenantId,
        occurredAt: event.occurredAt,
        category: event.category,
        action: event.action,
        outcome: event.outcome,
        source: event.source,
        schemaVersion: event.schemaVersion,
        embedding,
        ...(event.title !== undefined && { title: event.title }),
        ...(event.summary !== undefined && { summary: event.summary }),
        ...(event.message !== undefined && { message: event.message }),
        ...(event.actor && { actor: event.actor }),
        ...(event.object && { object: event.object }),
        ...(event.correlation && { correlation: event.correlation }),
        ...(event.metadata && { metadata: event.metadata }),
      }

      if (!documentsByDate.has(indexName)) {
        documentsByDate.set(indexName, [])
      }
      documentsByDate.get(indexName)!.push(document)
    }

    const indexPromises = Array.from(documentsByDate.entries()).map(
      ([indexName, documents]) =>
        this.indexingRepository.indexActivityEvents(documents, indexName)
    )

    await Promise.all(indexPromises)
  }

  async knnSearch(
    args: ISearchAdapterKnnSearchArgs
  ): Promise<ISearchAdapterKnnSearchResult[]> {
    return await this.indexingRepository.knnSearch(args)
  }
}

export const createIndexingService = (
  options: ICreateIndexingRepositoryOptions
) => {
  const indexingRepository = createIndexingRepository({
    embedding: options.embedding,
    opensearch: options.opensearch,
  })

  const embeddingAdapter = createEmbeddingAdapter({
    options: {
      provider: options.embedding.provider,
      model: {
        low: {
          model: options.embedding.model,
          dimension: 768,
        },
        medium: {
          model: options.embedding.model,
          dimension: 3072,
        },
        high: {
          model: options.embedding.model,
          dimension: 3072,
        },
      },
    },
  })

  const modelType: TSearchModelType = options.embedding.dimension === 768 ? 'low' : 'high'

  return new IndexingService({
    indexingRepository,
    embeddingAdapter,
    modelType,
  })
}
