import { google } from '@ai-sdk/google'
import { embed, type Embedding, type EmbeddingModel, embedMany } from 'ai'

import {
  ICreateEmbeddingAdapterOptions,
  IEmbeddingAdapter,
  IEmbeddingAdapterConfig,
  IEmbeddingAdapterEmbedArgs,
  IEmbeddingAdapterEmbedManyArgs,
} from '../interfaces'

export class EmbeddingAdapter implements IEmbeddingAdapter {
  private provider: IEmbeddingAdapterConfig['options']['provider']
  private modelOptions: IEmbeddingAdapterConfig['options']['model']

  constructor(options: IEmbeddingAdapterConfig) {
    this.provider = options.options.provider
    this.modelOptions = options.options.model
  }

  private getEmbeddingModel(
    provider: IEmbeddingAdapterConfig['options']['provider'],
    type: keyof IEmbeddingAdapterConfig['options']['model'],
    dimension?: IEmbeddingAdapterConfig['options']['model'][keyof IEmbeddingAdapterConfig['options']['model']]['dimension']
  ): EmbeddingModel {
    if (provider === 'google') {
      return google.embedding(this.modelOptions[type].model)
    }

    throw new Error(`Unsupported provider: ${provider}`)
  }

  getEmbeddingDimension(
    type: keyof IEmbeddingAdapterConfig['options']['model']
  ) {
    return this.modelOptions[type].dimension
  }

  async embed(input: IEmbeddingAdapterEmbedArgs): Promise<Embedding> {
    const model = this.getEmbeddingModel(this.provider, input.type)

    const { embedding } = await embed({
      model,
      value: input.value,
      providerOptions: {
        google: {
          taskType: 'RETRIEVAL_QUERY',
        },
      },
    })

    return embedding
  }

  async embedMany(input: IEmbeddingAdapterEmbedManyArgs): Promise<Embedding[]> {
    const model = this.getEmbeddingModel(this.provider, input.type)

    const { embeddings } = await embedMany({
      model,
      values: input.chunks,
    })

    return embeddings
  }
}

export const createEmbeddingAdapter = (
  options: ICreateEmbeddingAdapterOptions
) => {
  return new EmbeddingAdapter(options)
}
