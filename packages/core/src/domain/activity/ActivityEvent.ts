import { z } from 'zod'
import {
    ActivityCategory,
    ActivityOutcome,
} from '@betalogs/shared/constants'

export const ACTIVITY_EVENT_SCHEMA_VERSION = '1.0.0' as const

const SActor = z
    .object({
        userId: z.string().optional(),
        emailHash: z.string().optional(),
        serviceName: z.string().optional(),
        role: z.string().optional(),
    })
    .optional()

const SObject = z
    .object({
        orderId: z.string().optional(),
        requestId: z.string().optional(),
        sessionId: z.string().optional(),
        ticketId: z.string().optional(),
        resourceId: z.string().optional(),
    })
    .optional()

const SCorrelation = z
    .object({
        traceId: z.string().optional(),
        spanId: z.string().optional(),
        correlationId: z.string().optional(),
        parentEventId: z.uuid().optional(),
    })
    .optional()

export const SActivityEvent = z
    .object({
        schemaVersion: z.literal(ACTIVITY_EVENT_SCHEMA_VERSION),
        tenantId: z.uuid(),

        eventId: z.uuid(),

        occurredAt: z
            .string()
            .refine(
                (val) => {
                    const date = new Date(val)
                    return !isNaN(date.getTime()) && val.includes('T')
                },
                {
                    message: 'occurredAt must be a valid ISO 8601 datetime string',
                }
            ),

        category: z.enum([
            ActivityCategory.TECH,
            ActivityCategory.LOGISTICS,
            ActivityCategory.FINANCE,
            ActivityCategory.SECURITY,
            ActivityCategory.SUPPORT,
            ActivityCategory.PRODUCT,
            ActivityCategory.OPS,
            ActivityCategory.HR,
            ActivityCategory.UNKNOWN,
        ] as [string, ...string[]]),

        action: z.string().min(1, {
            message: 'action must be a non-empty string',
        }),

        outcome: z.enum([
            ActivityOutcome.SUCCESS,
            ActivityOutcome.FAILURE,
            ActivityOutcome.UNKNOWN,
        ] as [string, ...string[]]),

        source: z.string().min(1, {
            message: 'source must be a non-empty string',
        }),

        actor: SActor,
        object: SObject,
        correlation: SCorrelation,
        title: z.string().optional(),
        summary: z.string().optional(),
        message: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .strict()

export type TActivityEvent = z.infer<typeof SActivityEvent>

export function validateActivityEvent(data: unknown): TActivityEvent {
    return SActivityEvent.parse(data)
}

export function safeValidateActivityEvent(
    data: unknown
): { success: true; data: TActivityEvent } | { success: false; error: z.ZodError } {
    const result = SActivityEvent.safeParse(data)
    if (result.success) {
        return { success: true, data: result.data }
    }
    return { success: false, error: result.error }
}
