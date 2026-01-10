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

export class ChatRepository implements IChatRepository {
  private chatAgent: AgentAdapter<TChatToolOptions, TChatToolSet>

  constructor(options: IChatRepositoryOptions) {
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
    embedding: options.embedding,
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
