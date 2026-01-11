import { useMemo } from 'react'
import { format, isValid, parseISO } from 'date-fns'
import type { ICitation, IUseSummaryCardProps } from '~/features/story/types'

const CATEGORY_COLORS: Record<string, string> = {
    tech: 'bg-blue-100 text-blue-800',
    logistics: 'bg-purple-100 text-purple-800',
    finance: 'bg-green-100 text-green-800',
    security: 'bg-red-100 text-red-800',
    support: 'bg-yellow-100 text-yellow-800',
    product: 'bg-indigo-100 text-indigo-800',
    ops: 'bg-orange-100 text-orange-800',
    hr: 'bg-pink-100 text-pink-800',
    unknown: 'bg-gray-100 text-gray-800',
} as const

const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    try {
        const date = parseISO(dateString)
        if (!isValid(date)) return dateString
        return format(date, 'MMM d, yyyy h:mm a zzz')
    } catch {
        return dateString
    }
}

const getCategoryColor = (category: string) => {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.unknown
}

export function useSummaryCard({ story }: IUseSummaryCardProps) {

    const outcomeCounts = useMemo(
        () =>
            story.timeline.reduce((acc, entry) => {
                acc[entry.outcome] = (acc[entry.outcome] || 0) + 1
                return acc
            }, {} as Record<string, number>),
        [story.timeline]
    )

    const categories = useMemo(
        () => Array.from(new Set(story.timeline.map((e) => e.category))),
        [story.timeline]
    )

    const services = useMemo(
        () => Array.from(new Set(story.timeline.map((e) => e.service))),
        [story.timeline]
    )

    const uniqueSources = useMemo(() => {
        const sources: ICitation[] = story.rawEvents
            .filter((event) => event.citations && event.citations.length > 0)
            .map((event) => ({
                id: event.id,
                title: event.source || event.id,
                sourceId: event.id,
                occurredAt: event.timestamp,
                viewLink: `#event-${event.id}`,
            }))
        return Array.from(new Map(sources.map((s) => [s.id, s])).values())
    }, [story.rawEvents])

    return {
        formatDate,
        getCategoryColor,
        outcomeCounts,
        categories,
        services,
        uniqueSources,
    }
}
