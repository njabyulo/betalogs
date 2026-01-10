import { ToolSet } from 'ai'
import { createAgentAdapter } from '../../adapters/ai-sdk'
import type {
  AgentAdapter,
  IChatRepository,
  IChatRepositoryOptions,
  ICreateChatRepositoryOptions,
  TChatToolOptions,
  TChatToolSet,
} from '../interfaces'
import {
  createKnowledgeBaseSearchTool,
  createRewriteQueryTool,
} from './tools/opensearch'

export class ChatRepository<D, T extends ToolSet> implements IChatRepository {
  private chatAgent: AgentAdapter<D, T>

  constructor(options: IChatRepositoryOptions<D, T>) {
    this.chatAgent = options.chatAgent
  }

  async chat(prompt: string) {
    return await this.chatAgent.generateText({
      prompt,
      type: 'medium',
    })
  }
}

export const createChatRepository = (options: ICreateChatRepositoryOptions) => {
  const knowledgeBaseSearchTool = createKnowledgeBaseSearchTool({
    embedding: {
      ...options.embedding,
      dimension: 3072 as const,
    },
    opensearch: options.opensearch,
  })

  const rewriteQueryTool = createRewriteQueryTool({
    provider: options.text.provider,
    model: options.text.model,
  })

  const tools = ((tools: Set<TChatToolOptions>): TChatToolSet => {
    const toolSet: TChatToolSet = {}

    for (const tool of tools) {
      switch (tool) {
        case 'knowledge-base-search':
          toolSet.knowledgeBaseSearch = knowledgeBaseSearchTool
          break
        case 'rewrite-query':
          toolSet.rewriteQuery = rewriteQueryTool
          break
      }
    }

    return toolSet
  })(options.tools)

  const agentAdapter = createAgentAdapter<TChatToolOptions, TChatToolSet>({
    instructions: options.systemPrompt,
    provider: options.text.provider,
    model: options.text.model,
    tools,
    activeModelType: options.activeModelType,
  })

  return new ChatRepository({
    chatAgent: agentAdapter,
  })
}
