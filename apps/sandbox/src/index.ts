import {
  createChatService,
  createIndexingService,
} from '@betalogs/core/services'
import 'dotenv/config'
import { getSystemPrompt } from './prompts'
import { logs } from './data'
import { StoryOutputSchema } from './schemas'

const main = async () => {
  const indexingService = createIndexingService({
    embedding: {
      provider: 'google',
      model: 'gemini-embedding-001',
      dimension: 3072,
    },
    opensearch: {
      node: process.env.OPENSEARCH_NODE!,
      index: process.env.OPENSEARCH_INDEX!,
      username: process.env.OPENSEARCH_USERNAME,
      password: process.env.OPENSEARCH_PASSWORD,
    },
  })
  const chatService = createChatService<typeof StoryOutputSchema>({
    text: {
      provider: 'google',
      model: {
        low: 'gemini-2.5-flash-lite',
        medium: 'gemini-2.5-flash',
        high: 'gemini-2.5-flash-pro',
      },
    },
    embedding: {
      provider: 'google',
      model: 'gemini-embedding-001',
      dimension: 3072,
    },
    opensearch: {
      node: process.env.OPENSEARCH_NODE!,
      index: process.env.OPENSEARCH_INDEX!,
      username: process.env.OPENSEARCH_USERNAME,
      password: process.env.OPENSEARCH_PASSWORD,
    },
    systemPrompt: getSystemPrompt(),
    tools: new Set(['knowledge-base-search', 'rewrite-query', 'story-search']),
    activeModelType: 'medium',
    schema: StoryOutputSchema,
  })

  // await indexingService.clearIndex();
  // await indexingService.ensureIndex();

  // await indexingService.indexChunks(logs);

  const result = await chatService.chat('root cause for req_abc123')
  // const result = await chatService.chat('What potential issues could be causing the checkout failure?')
  console.log(JSON.stringify(result, null, 2))

  console.log('done')
}

main()
