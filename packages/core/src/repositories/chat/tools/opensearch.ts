import { tool } from 'ai'
import { z } from 'zod'
import { createSearchAdapter, createTextAdapter } from '../../../adapters'

interface ICreateRewriteQueryToolOptions {
  provider: 'google'
  model: {
    low: 'gemini-2.5-flash-lite'
    medium: 'gemini-2.5-flash'
    high: 'gemini-2.5-flash-pro'
  }
}

interface ICreateKnowledgeBaseSearchToolOptions {
  embedding: {
    provider: 'google'
    model: 'gemini-embedding-001'
    dimension: 3072
  }
  opensearch: {
    node: string
    index: string
    username?: string
    password?: string
  }
}

export const createRewriteQueryTool = (
  options: ICreateRewriteQueryToolOptions
) => {
  const textAdapter = createTextAdapter({
    provider: options.provider,
    model: options.model,
  })

  return tool({
    description:
      'Rewrite the following text into a concise, keyword-rich OpenSearch query string. Return **only** the optimized query string (no JSON, no explanations, no quotes). Preserve quoted phrases exactly, keep important identifiers (names, IDs, emails, dates, error codes), remove filler words, and add boolean operators (`AND`, `OR`, `-`) where helpful.',
    inputSchema: z.object({
      query: z.string().describe('The user question or search query'),
    }),
    execute: async ({ query }) => {
      return await textAdapter.generateText({
        system:
          'Rewrite the following text into a concise, keyword-rich OpenSearch query string. Return **only** the optimized query string (no JSON, no explanations, no quotes). Preserve quoted phrases exactly, keep important identifiers (names, IDs, emails, dates, error codes), remove filler words, and add boolean operators (`AND`, `OR`, `-`) where helpful.',
        prompt: query,
        type: 'low',
      })
    },
  })
}

export const createKnowledgeBaseSearchTool = (
  options: ICreateKnowledgeBaseSearchToolOptions
) => {
  const search = createSearchAdapter({
    embedding: options.embedding,
    opensearch: options.opensearch,
  })

  return tool({
    description:
      'Semantic search over the indexed knowledge base in OpenSearch. Use this to fetch relevant passages before answering.',
    inputSchema: z.object({
      query: z.string().describe('The user question or search query'),
      k: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe('How many results to return'),
    }),
    execute: async ({ query, k }) => {
      return await search.knnSearch({ query, k: k ?? 8 })
    },
  })
}
