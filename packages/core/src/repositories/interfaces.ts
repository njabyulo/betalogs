import { ToolSet } from 'ai'
import type { z } from 'zod'
import type {
  AgentAdapter,
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
  extends ICreateSearchAdapterOptions { }


export interface IChatRepository<TSchema extends z.ZodTypeAny> {
  chat(prompt: string): Promise<z.infer<TSchema>>
}

export interface IChatRepositoryOptions<D, T extends ToolSet, TSchema extends z.ZodTypeAny> {
  chatAgent: AgentAdapter<D, T, TSchema>
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