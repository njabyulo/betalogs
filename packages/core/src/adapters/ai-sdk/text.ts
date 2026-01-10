import { google } from '@ai-sdk/google'
import { generateText, LanguageModel } from 'ai'
import {
  ICreateTextAdapterOptions,
  ITextAdapterGenerateTextArgs,
  ITextAdapterOptions,
} from '../interfaces'

export class TextAdapter {
  private provider: ITextAdapterOptions['provider']
  private model: ITextAdapterOptions['model']

  constructor(options: ITextAdapterOptions) {
    this.provider = options.provider
    this.model = options.model
  }

  private getModel(
    provider: ITextAdapterOptions['provider'],
    type: keyof ITextAdapterOptions['model']
  ): LanguageModel {
    if (provider === 'google') {
      return google(this.model[type])
    }

    throw new Error(`Unsupported provider: ${provider}`)
  }

  async generateText(input: ITextAdapterGenerateTextArgs): Promise<string> {
    const { text } = await generateText({
      model: this.getModel(this.provider, input.type),
      system: input.system,
      prompt: input.prompt,
    })

    return text
  }
}

export const createTextAdapter = (options: ICreateTextAdapterOptions) => {
  return new TextAdapter(options)
}
