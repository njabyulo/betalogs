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
import type { TActivityEvent } from '../domain/activity/ActivityEvent'

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
  ensureIndexTemplate(): Promise<void>
  clearIndex(): Promise<void>
  indexActivityEvents(
    events: TActivityEvent[],
    options?: {
      embeddingSource?: (event: TActivityEvent) => string
    }
  ): Promise<void>
  knnSearch(
    args: ISearchAdapterKnnSearchArgs
  ): Promise<ISearchAdapterKnnSearchResult[]>
}
import type { IEmbeddingAdapter, TSearchModelType } from '../adapters/interfaces'

export interface IIndexingServiceOptions {
  indexingRepository: IndexingRepository
  embeddingAdapter: IEmbeddingAdapter
  modelType: TSearchModelType
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

import type {
  TMetadataRegistryEntry,
  TMetadataType,
} from '@betalogs/shared/types'
import type {
  IMetadataRegistryRepository,
  ICreateMetadataRegistryRepositoryOptions,
} from '../repositories/interfaces'

export interface IMetadataRegistryService {
  listKeys(tenantId: string): Promise<TMetadataRegistryEntry[]>
  registerKey(
    tenantId: string,
    key: string,
    type: TMetadataType,
    constraintsJson?: Record<string, unknown>,
    promoteTo?: string
  ): Promise<TMetadataRegistryEntry>
  deleteKey(tenantId: string, key: string): Promise<void>
  getRegistryForTenant(tenantId: string): Promise<Map<string, TMetadataRegistryEntry>>
}

export interface IMetadataRegistryServiceOptions {
  metadataRegistryRepository: IMetadataRegistryRepository
}

export interface ICreateMetadataRegistryServiceOptions
  extends ICreateMetadataRegistryRepositoryOptions { }
