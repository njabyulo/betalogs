import type {
  ISearchAdapterDocChunk,
  ISearchAdapterKnnSearchArgs,
  ISearchAdapterKnnSearchResult,
} from '../adapters/interfaces'
import type {
  ICreateChatRepositoryOptions,
  ICreateIndexingRepositoryOptions,
} from '../repositories/interfaces'

import type { ChatRepository } from '../repositories/chat'
import type { IndexingRepository } from '../repositories/indexing'

export type {
  ISearchAdapterDocChunk,
  ISearchAdapterKnnSearchArgs,
  ISearchAdapterKnnSearchResult,
} from '../adapters/interfaces'
export type { IndexingRepository } from '../repositories/indexing'
export type {
  IChatRepository,
  ICreateIndexingRepositoryOptions,
} from '../repositories/interfaces'

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
  extends ICreateIndexingRepositoryOptions { }
export interface IChatService {
  chat(prompt: string): Promise<string>
}
export interface IChatServiceOptions {
  chatRepository: ChatRepository
}
export interface ICreateChatServiceOptions
  extends ICreateChatRepositoryOptions { }
