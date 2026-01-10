import type {
  ISearchAdapterDocChunk,
  ISearchAdapterKnnSearchArgs,
  ISearchAdapterKnnSearchResult,
} from '../adapters/interfaces'
import type {
  IChatRepository,
  ICreateChatRepositoryOptions,
  ICreateIndexingRepositoryOptions,
} from '../repositories/interfaces'
import type { z } from 'zod'

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
export interface IChatService<TSchema extends z.ZodTypeAny> {
  chat(prompt: string): Promise<z.infer<TSchema>>
}
export interface IChatServiceOptions<TSchema extends z.ZodTypeAny> {
  chatRepository: IChatRepository<TSchema>
}
export interface ICreateChatServiceOptions<TSchema extends z.ZodTypeAny>
  extends ICreateChatRepositoryOptions<TSchema> { }
