import {
  ICreateSearchAdapterOptions,
  ISearchAdapter,
  ISearchAdapterDocChunk,
  ISearchAdapterKnnSearchArgs,
  ISearchAdapterKnnSearchResult,
} from '../adapters'

export interface IIndexingRepository {
  ensureIndex(): Promise<void>
  clearIndex(): Promise<void>
  indexChunks(chunks: ISearchAdapterDocChunk[]): Promise<void>
  knnSearch(
    args: ISearchAdapterKnnSearchArgs
  ): Promise<ISearchAdapterKnnSearchResult[]>
}

export interface IIndexingRepositoryOptions {
  searchAdapter: ISearchAdapter
}

export interface ICreateIndexingRepositoryOptions
  extends ICreateSearchAdapterOptions {}
