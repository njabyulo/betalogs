import { ToolSet } from 'ai'
import type { z } from 'zod'
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
  createStorySearchTool,
} from './tools/opensearch'

export class ChatRepository<D, T extends ToolSet, TSchema extends z.ZodTypeAny> implements IChatRepository<TSchema> {
  private chatAgent: AgentAdapter<D, T, TSchema>

  constructor(options: IChatRepositoryOptions<D, T, TSchema>) {
    this.chatAgent = options.chatAgent
  }

  async chat(prompt: string): Promise<z.infer<TSchema>> {
    const result = await this.chatAgent.generateText({
      prompt,
      type: 'medium',
    })
    if (!result.output) {
      throw new Error('Expected structured output but received none. Check that schema is properly configured.')
    }
    return result.output
  }
}

export const createChatRepository = <TSchema extends z.ZodTypeAny>(
  options: ICreateChatRepositoryOptions<TSchema>
) => {
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

  const storySearchTool = createStorySearchTool({
    opensearch: options.opensearch,
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
        case 'story-search':
          toolSet.storySearch = storySearchTool
          break
      }
    }

    return toolSet
  })(options.tools)

  const agentAdapter = createAgentAdapter<TChatToolOptions, TChatToolSet, TSchema>({
    instructions: options.systemPrompt,
    provider: options.text.provider,
    model: options.text.model,
    tools,
    activeModelType: options.activeModelType,
    output: {
      schema: options.schema,
    },
  })

  return new ChatRepository<TChatToolOptions, TChatToolSet, TSchema>({
    chatAgent: agentAdapter,
  })
}
