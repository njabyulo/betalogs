import { ToolSet } from 'ai'
import type { z } from 'zod'
import type {
  AgentAdapter,
  IActivityEventDocument,
  ICreateAgentAdapterOptions,
  ICreateSearchAdapterOptions,
  ICreateTextAdapterOptions,
  ISearchAdapter,
  ISearchAdapterDocChunk,
  ISearchAdapterKnnSearchArgs,
  ISearchAdapterKnnSearchResult,
} from '../adapters'
import type {
  createKnowledgeBaseSearchTool,
  createRewriteQueryTool,
  createStorySearchTool,
} from './chat/tools/opensearch'

export type {
  AgentAdapter
} from '../adapters'
export interface IIndexingRepository {
  ensureIndex(): Promise<void>
  ensureIndexTemplate(): Promise<void>
  clearIndex(): Promise<void>
  indexActivityEvents(
    documents: IActivityEventDocument[],
    indexName: string
  ): Promise<void>
  knnSearch(
    args: ISearchAdapterKnnSearchArgs
  ): Promise<ISearchAdapterKnnSearchResult[]>
}

export interface IIndexingRepositoryOptions {
  searchAdapter: ISearchAdapter
}

export interface ICreateIndexingRepositoryOptions
  extends ICreateSearchAdapterOptions { }


export interface IChatRepository<TSchema extends z.ZodTypeAny> {
  chat(prompt: string): Promise<z.infer<TSchema>>
}

export interface IChatRepositoryOptions<D, T extends ToolSet, TSchema extends z.ZodTypeAny> {
  chatAgent: AgentAdapter<D, T, TSchema>
  schema: TSchema
}

export type TChatToolSet = {
  knowledgeBaseSearch?: ReturnType<typeof createKnowledgeBaseSearchTool>
  rewriteQuery?: ReturnType<typeof createRewriteQueryTool>
  storySearch?: ReturnType<typeof createStorySearchTool>
}

export type TChatToolOptions = 'knowledge-base-search' | 'rewrite-query' | 'story-search'

export interface ICreateChatRepositoryOptions<TSchema extends z.ZodTypeAny>
  extends ICreateSearchAdapterOptions,
  Omit<
    ICreateAgentAdapterOptions<TChatToolOptions, TChatToolSet>,
    'tools' | 'provider' | 'model'
  > {
  text: ICreateTextAdapterOptions
  tools: Set<TChatToolOptions>
  systemPrompt: string
  schema: TSchema
}

import type {
  TMetadataRegistryEntry,
  TCreateMetadataRegistryEntry,
} from '@betalogs/shared/types'
import type { Database } from '@betalogs/database/connection'

export interface IMetadataRegistryRepository {
  findByTenantId(tenantId: string): Promise<TMetadataRegistryEntry[]>
  findByKey(tenantId: string, key: string): Promise<TMetadataRegistryEntry | null>
  create(entry: TCreateMetadataRegistryEntry): Promise<TMetadataRegistryEntry>
  delete(tenantId: string, key: string): Promise<void>
}

export interface IMetadataRegistryRepositoryOptions {
  db: Database
}

export interface ICreateMetadataRegistryRepositoryOptions {
  db: Database
}