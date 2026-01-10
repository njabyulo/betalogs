import { ToolSet } from 'ai'
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


export interface IChatRepository {
  chat(prompt: string): Promise<string>
}

export interface IChatRepositoryOptions<D, T extends ToolSet> {
  chatAgent: AgentAdapter<D, T>
}

export type TChatToolSet = {
  knowledgeBaseSearch?: ReturnType<typeof createKnowledgeBaseSearchTool>
  rewriteQuery?: ReturnType<typeof createRewriteQueryTool>
}

export type TChatToolOptions = 'knowledge-base-search' | 'rewrite-query'

export interface ICreateChatRepositoryOptions
  extends ICreateSearchAdapterOptions,
  Omit<
    ICreateAgentAdapterOptions<TChatToolOptions, TChatToolSet>,
    'tools' | 'provider' | 'model'
  > {
  text: ICreateTextAdapterOptions
  tools: Set<TChatToolOptions>
  systemPrompt: string
}