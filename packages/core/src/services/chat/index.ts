import type { z } from 'zod'
import { createChatRepository } from '../../repositories/chat'
import {
  IChatRepository,
  IChatService,
  IChatServiceOptions,
  ICreateChatServiceOptions,
} from '../interfaces'

class ChatService<TSchema extends z.ZodTypeAny> implements IChatService<TSchema> {
  private chatRepository: IChatRepository<TSchema>

  constructor(options: IChatServiceOptions<TSchema>) {
    this.chatRepository = options.chatRepository
  }

  async chat(prompt: string): Promise<z.infer<TSchema>> {
    return await this.chatRepository.chat(prompt)
  }
}

export const createChatService = <TSchema extends z.ZodTypeAny>(
  options: ICreateChatServiceOptions<TSchema>
) => {
  const chatRepository = createChatRepository<TSchema>({
    text: options.text,
    embedding: options.embedding,
    opensearch: options.opensearch,
    systemPrompt: options.systemPrompt,
    tools: options.tools,
    activeModelType: options.activeModelType,
    schema: options.schema,
  })

  return new ChatService<TSchema>({
    chatRepository,
  })
}
