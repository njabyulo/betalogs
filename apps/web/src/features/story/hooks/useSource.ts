import { useMemo } from 'react'
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'
import type { IUseSourceProps } from '~/features/story/types'

export function useSource({ citation, href, title }: IUseSourceProps) {
    const linkHref = useMemo(() => {
        return href || citation.viewLink || '#'
    }, [href, citation.viewLink])

    const displayTitle = useMemo(() => {
        return (
            title || citation.title || citation.sourceId || citation.id || 'Source'
        )
    }, [title, citation.title, citation.sourceId, citation.id])

    const { formattedDate, tooltipContent } = useMemo(() => {
        if (!citation.occurredAt) {
            return {
                formattedDate: null,
                tooltipContent: null,
            }
        }

        try {
            const date = parseISO(citation.occurredAt)
            if (!isValid(date)) {
                return {
                    formattedDate: null,
                    tooltipContent: null,
                }
            }

            const now = new Date()
            const daysDiff = Math.abs(
                (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
            )

            return {
                formattedDate:
                    daysDiff < 7
                        ? formatDistanceToNow(date, { addSuffix: true })
                        : format(date, 'MMM d, yyyy'),
                tooltipContent: format(date, 'MMM d, yyyy h:mm a'),
            }
        } catch {
            return {
                formattedDate: null,
                tooltipContent: null,
            }
        }
    }, [citation.occurredAt])

    return {
        linkHref,
        displayTitle,
        formattedDate,
        tooltipContent,
    }
}
