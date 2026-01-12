import { tool } from 'ai'
import { z } from 'zod'
import { createSearchAdapter, createTextAdapter } from '../../../adapters'
import type {
  ISearchAdapterExactSearchArgs,
} from '../../../adapters/interfaces'

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

interface ICreateStorySearchToolOptions {
  embedding: {
    provider: 'google'
    model: 'gemini-embedding-001'
    dimension: 3072 | 768
  }
  opensearch: {
    node: string
    index: string
    username?: string
    password?: string
  }
}

export const createStorySearchTool = (
  options: ICreateStorySearchToolOptions
) => {
  const search = createSearchAdapter({
    embedding: options.embedding,
    opensearch: options.opensearch,
  })

  const MAX_EVENTS_IN_OUTPUT = 30

  const selectRepresentativeEvents = (events: Array<{
    id: string
    timestamp: string
    level: string
    service: string
    message: string
  }>): Array<{
    id: string
    timestamp: string
    level: string
    service: string
    message: string
  }> => {
    if (events.length <= MAX_EVENTS_IN_OUTPUT) {
      return events
    }

    const critical = events.filter((e) =>
      e.level === 'error' || e.level === 'critical' || e.level === 'failure'
    )
    const recent = events.slice(-10)
    const early = events.slice(0, 10)

    const selectedIds = new Set<string>()
    const selected: typeof events = []

    const addIfNotSelected = (event: typeof events[0]) => {
      if (!selectedIds.has(event.id) && selected.length < MAX_EVENTS_IN_OUTPUT) {
        selectedIds.add(event.id)
        selected.push(event)
      }
    }

    critical.forEach(addIfNotSelected)
    early.forEach(addIfNotSelected)

    const remaining = MAX_EVENTS_IN_OUTPUT - selected.length
    if (remaining > 0) {
      const middleStart = Math.floor(events.length * 0.3)
      const middleEnd = Math.floor(events.length * 0.7)
      const middleEvents = events.slice(middleStart, middleEnd)
      const step = Math.max(1, Math.floor(middleEvents.length / remaining))

      for (let i = 0; i < middleEvents.length && selected.length < MAX_EVENTS_IN_OUTPUT; i += step) {
        addIfNotSelected(middleEvents[i]!)
      }
    }

    recent.forEach(addIfNotSelected)

    return selected.slice(0, MAX_EVENTS_IN_OUTPUT)
  }

  return tool({
    description:
      'Exact search for all events related to a specific identifier. Common types include: orderId, shipmentId, ticketId, traceId, requestId, email, checkoutId, userId, emailHash. Use this when the user provides a specific identifier to retrieve the complete timeline of events. Returns all matching events sorted chronologically.',
    inputSchema: z.object({
      identifier: z
        .string()
        .describe(
          'The identifier value to search for (e.g., "order_ord123", "req_abc456", "alice@example.com")'
        ),
      identifierType: z
        .string()
        .describe('The type of identifier being searched (e.g., "orderId", "requestId", "email", etc.)'),
    }),
    execute: async ({ identifier, identifierType }) => {
      const results = await search.exactSearch({
        identifier,
        identifierType,
      })
      return results.map((result) => ({
        id: result.id,
        timestamp: result.timestamp,
        level: result.level,
        service: result.service,
        message: result.message,
        metadata: undefined,
      }))
    },
    toModelOutput: async ({ output }) => {
      const events = Array.isArray(output) ? output : []
      const totalEvents = events.length
      const selectedEvents = selectRepresentativeEvents(events)

      if (totalEvents <= MAX_EVENTS_IN_OUTPUT) {
        return {
          type: 'text' as const,
          value: JSON.stringify({
            total: totalEvents,
            events: selectedEvents,
          }),
        }
      }

      const timeRange = {
        start: events[0]?.timestamp,
        end: events[events.length - 1]?.timestamp,
      }

      return {
        type: 'text' as const,
        value: JSON.stringify({
          total: totalEvents,
          shown: selectedEvents.length,
          selection: 'prioritized (critical events + temporal distribution)',
          timeRange,
          events: selectedEvents,
          summary: {
            omitted: totalEvents - selectedEvents.length,
            note: `Selected ${selectedEvents.length} representative events from ${totalEvents} total. Includes all critical events plus evenly distributed samples across timeline.`,
          },
        }),
      }
    },
  })
}
