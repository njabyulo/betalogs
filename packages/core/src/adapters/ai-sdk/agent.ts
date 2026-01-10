import { google } from '@ai-sdk/google'
import { LanguageModel, ToolLoopAgent, ToolSet } from 'ai'
import {
  IAgentAdapterGenerateTextArgs,
  IAgentAdapterOptions,
  ICreateAgentAdapterOptions,
  TAgentAdapterModelOptions,
  TAgentAdapterModelType,
} from '../interfaces'

export class AgentAdapter<D, T extends ToolSet> {
  private provider: 'google'
  private model: TAgentAdapterModelOptions<D, T>
  private activeModelType: TAgentAdapterModelType<D, T>
  private agent: ToolLoopAgent<never, T, never>

  constructor(options: ICreateAgentAdapterOptions<D, T>) {
    this.provider = options.provider
    this.model = options.model
    this.activeModelType = options.activeModelType
    this.agent = new ToolLoopAgent<never, T, never>({
      model: this.getModel(this.provider, this.activeModelType),
      instructions: options.instructions,
      tools: options.tools as T,
      stopWhen: options.stopWhen,
      onStepFinish: (step) => {
        console.log('================================================')
        step.content.forEach((part) => {
          if (part.type === 'text') {
            console.log({
              text: part.text,
            })
          } else if (part.type === 'tool-result') {
            console.log({
              output: part.output,
            })
          } else if (part.type === 'tool-call') {
            console.log({
              toolName: part.toolName,
              input: part.input,
            })
          }
        })
        console.log('================================================\n\n')
      },
    })
  }

  private getModel(
    provider: IAgentAdapterOptions<D, T>['provider'],
    type: keyof IAgentAdapterOptions<D, T>['model']
  ): LanguageModel {
    if (provider === 'google') {
      return google(this.model[type])
    }

    throw new Error(`Unsupported provider: ${provider}`)
  }

  async generateText(
    input: IAgentAdapterGenerateTextArgs<D, T>
  ): Promise<string> {
    const { text } = await this.agent.generate({
      prompt: input.prompt,
    })

    return text
  }
}

export const createAgentAdapter = <D, T extends ToolSet>(
  options: ICreateAgentAdapterOptions<D, T>
) => {
  return new AgentAdapter<D, T>(options)
}
