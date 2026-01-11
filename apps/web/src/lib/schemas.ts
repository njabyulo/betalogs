// Re-export the StoryOutputSchema from a shared location
// For now, we'll define it here to match the sandbox implementation

import { z } from 'zod'

export const StoryTimelineEntrySchema = z.object({
  timestamp: z.string().describe('ISO timestamp'),
  level: z.string().describe('Log level or "unknown"'),
  category: z
    .enum([
      'tech',
      'logistics',
      'finance',
      'security',
      'support',
      'product',
      'ops',
      'hr',
      'unknown',
    ])
    .describe('Event category'),
  service: z.string().describe('Service name or source'),
  action: z.string().describe('Action taken or "unknown"'),
  outcome: z
    .enum(['success', 'failure', 'unknown'])
    .describe('Outcome of the event'),
  message: z.string().describe('Short message describing the event'),
  id: z.string().describe('Event ID'),
  citations: z.array(z.string()).describe('Citation references like [id: X]'),
})

export const StoryRawEventSchema = z.object({
  id: z.string().describe('Event ID'),
  timestamp: z.string().describe('ISO timestamp'),
  source: z.string().describe('Event source'),
  payload: z.any().describe('Full event object as JSON'),
  citations: z.array(z.string()).describe('Citation references'),
})

export const StoryTimeRangeSchema = z.object({
  from: z.string().nullable().describe('ISO timestamp or null'),
  to: z.string().nullable().describe('ISO timestamp or null'),
})

export const StoryOutputSchema = z.object({
  story: z.object({
    identifier: z.string().describe('The identifier used for the search'),
    identifierType: z
      .enum([
        'orderId',
        'shipmentId',
        'ticketId',
        'traceId',
        'requestId',
        'checkoutId',
        'userId',
        'email',
        'emailHash',
      ])
      .describe('Type of identifier'),
    timeRange: StoryTimeRangeSchema,
    timeline: z.array(StoryTimelineEntrySchema).describe('Chronological events'),
    rawEvents: z
      .array(StoryRawEventSchema)
      .describe('Complete event data with full metadata'),
    summary: z.string().describe('2-3 sentence summary with citations'),
    impact: z.string().describe('Key outcomes with citations'),
    duration: z.string().nullable().describe('Human-readable duration or null'),
    eventCount: z.number().int().min(0).describe('Total number of events'),
  }),
})

export type StoryOutput = z.infer<typeof StoryOutputSchema>
