import {
  createSearchAdapter,
  ISearchAdapter,
  ISearchAdapterDocChunk,
  ISearchAdapterKnnSearchArgs,
  ISearchAdapterKnnSearchResult,
} from '../../adapters'
import {
  ICreateIndexingRepositoryOptions,
  IIndexingRepositoryOptions,
} from '../interfaces'

export class IndexingRepository {
  private searchAdapter: ISearchAdapter
  constructor(options: IIndexingRepositoryOptions) {
    this.searchAdapter = options.searchAdapter
  }

  async ensureIndex(): Promise<void> {
    return await this.searchAdapter.ensureIndex()
  }

  async clearIndex(): Promise<void> {
    return await this.searchAdapter.clearIndex()
  }

  async indexChunks(chunks: ISearchAdapterDocChunk[]): Promise<void> {
    return await this.searchAdapter.indexChunks(chunks)
  }

  async knnSearch(
    args: ISearchAdapterKnnSearchArgs
  ): Promise<ISearchAdapterKnnSearchResult[]> {
    return await this.searchAdapter.knnSearch(args)
  }
}

export const createIndexingRepository = (
  options: ICreateIndexingRepositoryOptions
) => {
  const searchAdapter = createSearchAdapter({
    embedding: {
      provider: options.embedding.provider,
      model: options.embedding.model,
      dimension: options.embedding.dimension,
    },
    opensearch: {
      node: options.opensearch.node,
      index: options.opensearch.index,
      username: options.opensearch.username,
      password: options.opensearch.password,
    },
  })
  return new IndexingRepository({
    searchAdapter,
  })
}
