import type {
  ISearchAdapterDocChunk,
  ISearchAdapterKnnSearchArgs,
  ISearchAdapterKnnSearchResult,
} from '../adapters/interfaces'
import type { IndexingRepository } from '../repositories/indexing'
import type { ICreateIndexingRepositoryOptions } from '../repositories/interfaces'

export type {
  ISearchAdapterDocChunk,
  ISearchAdapterKnnSearchArgs,
  ISearchAdapterKnnSearchResult,
} from '../adapters/interfaces'
export type { IndexingRepository } from '../repositories/indexing'

export type { ICreateIndexingRepositoryOptions } from '../repositories/interfaces'

export interface IIndexingService {
  ensureIndex(): Promise<void>
  clearIndex(): Promise<void>
  indexChunks(chunks: ISearchAdapterDocChunk[]): Promise<void>
  knnSearch(
    args: ISearchAdapterKnnSearchArgs
  ): Promise<ISearchAdapterKnnSearchResult[]>
}

export interface IIndexingServiceOptions {
  indexingRepository: IndexingRepository
}

export interface ICreateIndexingServiceOptions
  extends ICreateIndexingRepositoryOptions {}
