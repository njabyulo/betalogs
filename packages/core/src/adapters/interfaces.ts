import type { Embedding, ToolLoopAgentSettings, ToolSet } from 'ai'

export interface ISearchEmbeddingModelArgs {
  provider: 'google'
  model: 'gemini-embedding-001'
  dimension: 3072 | 768
}

export interface IEmbeddingAdapterConfig {
  options: {
    provider: 'google'
    model: {
      low: {
        model: 'gemini-embedding-001'
        dimension: 768
      }
      medium: {
        model: 'gemini-embedding-001'
        dimension: 3072
      }
      high: {
        model: 'gemini-embedding-001'
        dimension: 3072
      }
    }
  }
}
export interface ICreateEmbeddingAdapterOptions
  extends IEmbeddingAdapterConfig {}
export interface IEmbeddingAdapterEmbedArgs {
  value: string
  type: keyof IEmbeddingAdapterConfig['options']['model']
}
export interface IEmbeddingAdapterEmbedManyArgs {
  chunks: string[]
  type: keyof IEmbeddingAdapterConfig['options']['model']
}

export interface IEmbeddingAdapter {
  getEmbeddingDimension(type: 'low' | 'medium' | 'high'): 768 | 3072
  embed(input: IEmbeddingAdapterEmbedArgs): Promise<Embedding>
  embedMany(input: IEmbeddingAdapterEmbedManyArgs): Promise<Embedding[]>
}

export type TSearchModelType = keyof IEmbeddingAdapterConfig['options']['model']

export interface ISearchAdapterOptions {
  embeddingAdapter: IEmbeddingAdapter
  modelType: TSearchModelType
  opensearch: {
    node: string
    index: string
    username?: string
    password?: string
  }
}

export interface ICreateSearchAdapterOptions {
  embedding: ISearchEmbeddingModelArgs
  opensearch: {
    node: string
    index: string
    username?: string
    password?: string
  }
}

export interface ISearchAdapterDocChunk {
  id: string
  timestamp: string
  level: string
  service: string
  message: string
  metadata?: Record<string, unknown>
}

export interface ISearchAdapterKnnSearchArgs {
  query: string
  k?: number
  filter?: Record<string, unknown>
}

export interface ISearchAdapterKnnSearchResult {
  id: string
  score: number
  text: string
  metadata: Record<string, unknown>
}

export interface ISearchAdapter {
  ensureIndex(): Promise<void>
  clearIndex(): Promise<void>
  indexChunks(chunks: ISearchAdapterDocChunk[]): Promise<void>
  knnSearch(
    args: ISearchAdapterKnnSearchArgs
  ): Promise<ISearchAdapterKnnSearchResult[]>
}

export interface ITextAdapterOptions {
  provider: 'google'
  model: {
    low: 'gemini-2.5-flash-lite'
    medium: 'gemini-2.5-flash'
    high: 'gemini-2.5-flash-pro'
  }
}
export interface ICreateTextAdapterOptions extends ITextAdapterOptions {}
export interface ITextAdapterGenerateTextArgs {
  prompt: string
  system?: string
  type: keyof ITextAdapterOptions['model']
}

export interface IAgentAdapterOptions<D, T>
  extends Omit<ToolLoopAgentSettings<never, any, never>, 'model'> {
  provider: 'google'
  model: {
    low: 'gemini-2.5-flash-lite'
    medium: 'gemini-2.5-flash'
    high: 'gemini-2.5-flash-pro'
  }
  tools: ToolSet
  activeModelType: keyof IAgentAdapterOptions<D, T>['model']
}
export interface ICreateAgentAdapterOptions<D, T>
  extends IAgentAdapterOptions<D, T> {}
export type TAgentAdapterModelOptions<D, T> = IAgentAdapterOptions<
  D,
  T
>['model']
export type TAgentAdapterModelType<D, T> = keyof IAgentAdapterOptions<
  D,
  T
>['model']
export interface IAgentAdapterGenerateTextArgs<D, T> {
  prompt: string
  system?: string
  type: keyof IAgentAdapterOptions<D, T>['model']
}
