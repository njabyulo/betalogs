import { createChatService } from '@betalogs/core/services'
import { SStoryOutput } from './schemas'
import { getSystemPrompt } from './prompts'

export function getChatService() {
    return createChatService<typeof SStoryOutput>({
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
        schema: SStoryOutput,
    })
}
