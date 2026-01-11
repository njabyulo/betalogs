'use client'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible'
import { cn } from '~/lib/utils'
import { BookIcon, ChevronDownIcon } from 'lucide-react'
import { format, isValid, parseISO, formatDistanceToNow } from 'date-fns'
import type { ComponentProps } from 'react'

export type SourcesProps = ComponentProps<typeof Collapsible>

export const Sources = ({ className, ...props }: SourcesProps) => (
  <Collapsible
    className={cn('not-prose mb-4 text-primary text-xs', className)}
    {...props}
  />
)

export type SourcesTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  count: number
}

export const SourcesTrigger = ({
  className,
  count,
  children,
  ...props
}: SourcesTriggerProps) => (
  <CollapsibleTrigger
    className={cn('flex items-center gap-2', className)}
    {...props}
  >
    {children ?? (
      <>
        <p className="font-medium">
          Used {count} source{count !== 1 ? 's' : ''}
        </p>
        <ChevronDownIcon className="h-4 w-4" />
      </>
    )}
  </CollapsibleTrigger>
)

export type SourcesContentProps = ComponentProps<typeof CollapsibleContent>

export const SourcesContent = ({
  className,
  ...props
}: SourcesContentProps) => (
  <CollapsibleContent
    className={cn(
      'mt-3 flex w-fit flex-col gap-2',
      'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
      className
    )}
    {...props}
  />
)

export interface Citation {
  id: string
  title?: string
  sourceId?: string
  occurredAt?: string
  viewLink?: string
}

export type SourceProps = ComponentProps<'a'> & {
  citation: Citation
}

export const Source = ({
  citation,
  href,
  title,
  children,
  className,
  ...props
}: SourceProps) => {
  // Use viewLink if available, otherwise construct a fallback href
  const linkHref = href || citation.viewLink || '#'
  const displayTitle =
    title || citation.title || citation.sourceId || citation.id || 'Source'

  // Format the date using date-fns
  const formatCitationDate = (dateString: string | undefined) => {
    if (!dateString) return null
    try {
      const date = parseISO(dateString)
      if (!isValid(date)) return null
      // Show relative time for recent dates, absolute for older ones
      const now = new Date()
      const daysDiff = Math.abs(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysDiff < 7) {
        return formatDistanceToNow(date, { addSuffix: true })
      }
      return format(date, 'MMM d, yyyy')
    } catch {
      return null
    }
  }

  const formattedDate = formatCitationDate(citation.occurredAt)

  return (
    <a
      className={cn('flex items-center gap-2', className)}
      href={linkHref}
      rel="noreferrer"
      target="_blank"
      {...props}
    >
      {children ?? (
        <>
          <BookIcon className="h-4 w-4 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="block font-medium truncate">{displayTitle}</span>
            {formattedDate && (
              <span className="text-xs text-muted-foreground">
                {formattedDate}
              </span>
            )}
          </div>
        </>
      )}
    </a>
  )
}
