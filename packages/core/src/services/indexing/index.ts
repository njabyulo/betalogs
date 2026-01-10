import { createIndexingRepository } from '../../repositories/indexing'
import {
  ICreateIndexingRepositoryOptions,
  IIndexingService,
  IIndexingServiceOptions,
  IndexingRepository,
  ISearchAdapterDocChunk,
  ISearchAdapterKnnSearchArgs,
  ISearchAdapterKnnSearchResult,
} from '../interfaces'

class IndexingService implements IIndexingService {
  private indexingRepository: IndexingRepository

  constructor(options: IIndexingServiceOptions) {
    this.indexingRepository = options.indexingRepository
  }

  async ensureIndex(): Promise<void> {
    return await this.indexingRepository.ensureIndex()
  }

  async clearIndex(): Promise<void> {
    return await this.indexingRepository.clearIndex()
  }

  async indexChunks(chunks: ISearchAdapterDocChunk[]): Promise<void> {
    return await this.indexingRepository.indexChunks(chunks)
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

  return new IndexingService({
    indexingRepository,
  })
}
