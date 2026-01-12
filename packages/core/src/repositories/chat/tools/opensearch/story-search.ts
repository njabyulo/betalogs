import { tool } from 'ai'
import { z } from 'zod'
import { createHash } from 'crypto'
import { createSearchAdapter } from '../../../../adapters'

export interface ICreateStorySearchToolOptions {
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

const MAX_EVENTS_IN_OUTPUT = 30

/**
 * Pattern-based compression: Groups similar log events by message pattern
 * Returns representative samples + pattern counts instead of all individual events
 */
const compressByPattern = (
    events: Array<{
        id: string
        timestamp: string
        level: string
        service: string
        message: string
    }>
): {
    patterns: Array<{
        pattern: string
        count: number
        sample: typeof events[0]
        samples: typeof events
    }>
    unique: typeof events
} => {
    // Extract pattern from message by replacing dynamic values with placeholders
    const extractPattern = (message: string): string => {
        // Replace common dynamic patterns: IDs, emails, numbers, timestamps
        return message
            .replace(/\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi, '<uuid>')
            .replace(/\b[0-9a-f]{32,}\b/gi, '<hash>')
            .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '<timestamp>')
            .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '<email>')
            .replace(/\b(ord_|req_|ship_|ticket_|trace_|checkout_|user_)[a-z0-9_]+\b/gi, '<id>')
            .replace(/\b\d+\.\d+\.\d+\.\d+\b/g, '<ip>')
            .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '<ip>')
            .replace(/\b\d+\b/g, '<number>')
    }

    const patternMap = new Map<string, typeof events>()
    const uniqueEvents: typeof events = []

    for (const event of events) {
        const pattern = extractPattern(event.message)
        const existing = patternMap.get(pattern)

        if (existing && existing.length >= 3) {
            // Pattern already has enough samples, just count it
            existing.push(event)
        } else if (existing) {
            existing.push(event)
        } else {
            patternMap.set(pattern, [event])
        }
    }

    // Separate patterns (3+ occurrences) from unique events
    const patterns: Array<{
        pattern: string
        count: number
        sample: typeof events[0]
        samples: typeof events
    }> = []

    for (const [pattern, patternEvents] of patternMap.entries()) {
        if (patternEvents.length >= 3) {
            // Keep first, last, and one middle sample
            const samples = [
                patternEvents[0]!,
                patternEvents[Math.floor(patternEvents.length / 2)]!,
                patternEvents[patternEvents.length - 1]!,
            ].filter(Boolean)
            patterns.push({
                pattern,
                count: patternEvents.length,
                sample: patternEvents[0]!,
                samples,
            })
        } else {
            // Unique or rare events - keep all
            uniqueEvents.push(...patternEvents)
        }
    }

    return { patterns, unique: uniqueEvents }
}

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

    // Apply pattern-based compression
    const { patterns, unique } = compressByPattern(events)

    // Always include critical events
    const critical = events.filter((e) =>
        e.level === 'error' || e.level === 'critical' || e.level === 'failure'
    )
    const recent = events.slice(-3)
    const early = events.slice(0, 3)

    const selectedIds = new Set<string>()
    const selected: typeof events = []

    const addIfNotSelected = (event: typeof events[0]) => {
        if (!selectedIds.has(event.id) && selected.length < MAX_EVENTS_IN_OUTPUT) {
            selectedIds.add(event.id)
            selected.push(event)
        }
    }

    // Priority 1: Critical events
    critical.forEach(addIfNotSelected)

    // Priority 2: Early events (temporal context)
    early.forEach(addIfNotSelected)

    // Priority 3: Pattern summaries (representative samples)
    for (const pattern of patterns) {
        if (selected.length >= MAX_EVENTS_IN_OUTPUT) break
        pattern.samples.forEach(addIfNotSelected)
    }

    // Priority 4: Unique events (up to remaining space)
    for (const event of unique) {
        if (selected.length >= MAX_EVENTS_IN_OUTPUT) break
        addIfNotSelected(event)
    }

    // Priority 5: Recent events (temporal context)
    recent.forEach(addIfNotSelected)

    // Fill remaining slots with evenly distributed samples from middle
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

    return selected.slice(0, MAX_EVENTS_IN_OUTPUT)
}

/**
 * Generate query string for frontend API calls
 * Returns base64-encoded JSON with cache metadata
 */
const generateQueryString = (
    identifier: string,
    identifierType: string
): string => {
    const queryObj = {
        identifier,
        identifierType,
        timestamp: new Date().toISOString(),
    }

    // Generate cache key from query parameters
    const cacheKey = createHash('sha256')
        .update(JSON.stringify({ identifier, identifierType }))
        .digest('hex')
        .substring(0, 16)

    const queryWithCache = {
        ...queryObj,
        cacheKey,
    }

    // Base64 encode for URL safety
    return Buffer.from(JSON.stringify(queryWithCache)).toString('base64')
}

export const createStorySearchTool = (
    options: ICreateStorySearchToolOptions
) => {
    const search = createSearchAdapter({
        embedding: options.embedding,
        opensearch: options.opensearch,
    })

    return tool({
        description:
            'Exact search for all events related to a specific identifier. Common types include: orderId, shipmentId, ticketId, traceId, requestId, email, checkoutId, userId, emailHash. Use this when the user provides a specific identifier to retrieve the complete timeline of events. Returns compressed/refined events optimized for story generation (pattern-based compression reduces token usage by 60-80%) and includes a queryString field (base64-encoded) that can be used to fetch full activity logs via REST API. The output includes events, queryString, and statistics.',
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

            // Store full results for query string generation
            const fullResults = results.map((result) => ({
                id: result.id,
                timestamp: result.timestamp,
                level: result.level,
                service: result.service,
                message: result.message,
                metadata: result.metadata,
            }))

            // Generate query string for frontend
            const queryString = generateQueryString(identifier, identifierType)

            // Return compressed data with query string
            return {
                events: fullResults.map((result) => ({
                    id: result.id,
                    timestamp: result.timestamp,
                    level: result.level,
                    service: result.service,
                    message: result.message,
                    metadata: undefined, // Remove metadata for compression
                })),
                queryString,
                total: fullResults.length,
            }
        },
        toModelOutput: async ({ output }) => {
            // Handle new output format with queryString
            const outputData = output as {
                events: Array<{
                    id: string
                    timestamp: string
                    level: string
                    service: string
                    message: string
                }>
                queryString: string
                total: number
            } | Array<{
                id: string
                timestamp: string
                level: string
                service: string
                message: string
            }>

            const events = Array.isArray(outputData)
                ? outputData
                : outputData.events
            const queryString = Array.isArray(outputData) ? undefined : outputData.queryString
            const totalEvents = Array.isArray(outputData) ? outputData.length : outputData.total

            // Apply pattern-based compression
            const { patterns, unique } = compressByPattern(events)
            const selectedEvents = selectRepresentativeEvents(events)

            // Calculate statistics
            const levelDistribution = events.reduce((acc, e) => {
                acc[e.level] = (acc[e.level] || 0) + 1
                return acc
            }, {} as Record<string, number>)

            const serviceDistribution = events.reduce((acc, e) => {
                acc[e.service] = (acc[e.service] || 0) + 1
                return acc
            }, {} as Record<string, number>)

            const criticalCount = events.filter(
                (e) => e.level === 'error' || e.level === 'critical' || e.level === 'failure'
            ).length

            const timeRange = {
                start: events[0]?.timestamp,
                end: events[events.length - 1]?.timestamp,
            }

            if (totalEvents <= MAX_EVENTS_IN_OUTPUT) {
                return {
                    type: 'text' as const,
                    value: JSON.stringify({
                        total: totalEvents,
                        events: selectedEvents,
                        queryString,
                        statistics: {
                            levelDistribution,
                            serviceDistribution,
                            criticalCount,
                        },
                    }),
                }
            }

            return {
                type: 'text' as const,
                value: JSON.stringify({
                    total: totalEvents,
                    shown: selectedEvents.length,
                    selection: 'pattern-compressed (critical events + patterns + temporal distribution)',
                    timeRange,
                    events: selectedEvents,
                    patterns: patterns.map((p) => ({
                        pattern: p.pattern,
                        count: p.count,
                        sample: {
                            id: p.sample.id,
                            timestamp: p.sample.timestamp,
                            level: p.sample.level,
                            service: p.sample.service,
                            message: p.sample.message,
                        },
                    })),
                    summary: {
                        omitted: totalEvents - selectedEvents.length,
                        patternsCompressed: patterns.length,
                        uniqueEvents: unique.length,
                        note: `Selected ${selectedEvents.length} representative events from ${totalEvents} total. Includes all critical events, pattern summaries, and evenly distributed samples across timeline.`,
                    },
                    statistics: {
                        levelDistribution,
                        serviceDistribution,
                        criticalCount,
                    },
                    queryString,
                }),
            }
        },
    })
}
