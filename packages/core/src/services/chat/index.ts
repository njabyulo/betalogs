import { createChatRepository } from '../../repositories/chat'
import {
  IChatRepository,
  IChatService,
  IChatServiceOptions,
  ICreateChatServiceOptions,
} from '../interfaces'

class ChatService implements IChatService {
  private chatRepository: IChatRepository

  constructor(options: IChatServiceOptions) {
    this.chatRepository = options.chatRepository
  }

  async chat(prompt: string): Promise<string> {
    const result = await this.chatRepository.chat(prompt)
    return result
  }
}

export const createChatService = (options: ICreateChatServiceOptions) => {
  const chatRepository = createChatRepository({
    text: options.text,
    embedding: options.embedding,
    opensearch: options.opensearch,
    systemPrompt: options.systemPrompt,
    tools: options.tools,
    activeModelType: options.activeModelType,
  })

  return new ChatService({
    chatRepository,
  })
}
