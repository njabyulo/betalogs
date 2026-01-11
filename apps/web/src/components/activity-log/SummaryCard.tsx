'use client'

import type { StoryOutput } from '~/lib/schemas'
import { Badge } from '~/components/ui/badge'
import { format, isValid, parseISO } from 'date-fns'
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
  type Citation,
} from './Sources'

interface SummaryCardProps {
  story: StoryOutput['story']
}

export function SummaryCard({ story }: SummaryCardProps) {
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
    const colors: Record<string, string> = {
      tech: 'bg-blue-100 text-blue-800',
      logistics: 'bg-purple-100 text-purple-800',
      finance: 'bg-green-100 text-green-800',
      security: 'bg-red-100 text-red-800',
      support: 'bg-yellow-100 text-yellow-800',
      product: 'bg-indigo-100 text-indigo-800',
      ops: 'bg-orange-100 text-orange-800',
      hr: 'bg-pink-100 text-pink-800',
      unknown: 'bg-gray-100 text-gray-800',
    }
    return colors[category] || colors.unknown
  }

  // Count outcomes
  const outcomeCounts = story.timeline.reduce(
    (acc, entry) => {
      acc[entry.outcome] = (acc[entry.outcome] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  // Get unique categories
  const categories = Array.from(
    new Set(story.timeline.map((e) => e.category))
  )

  // Get unique services
  const services = Array.from(new Set(story.timeline.map((e) => e.service)))

  // Extract unique sources from rawEvents
  const sources: Citation[] = story.rawEvents
    .filter((event) => event.citations && event.citations.length > 0)
    .map((event) => ({
      id: event.id,
      title: event.source || event.id,
      sourceId: event.id,
      occurredAt: event.timestamp,
      viewLink: `#event-${event.id}`,
    }))
  // Remove duplicates by id
  const uniqueSources = Array.from(
    new Map(sources.map((s) => [s.id, s])).values()
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Summary</h3>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{story.eventCount} events</span>
          {story.duration && <span>• {story.duration}</span>}
        </div>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600 mb-1">Identifier</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{story.identifierType}</Badge>
            <span className="font-mono text-xs">{story.identifier}</span>
          </div>
        </div>

        <div>
          <p className="text-gray-600 mb-1">Time Range</p>
          <div className="text-xs space-y-0.5">
            <div>
              <span className="text-gray-500">From: </span>
              {formatDate(story.timeRange.from)}
            </div>
            <div>
              <span className="text-gray-500">To: </span>
              {formatDate(story.timeRange.to)}
            </div>
          </div>
        </div>

        <div>
          <p className="text-gray-600 mb-1">Outcomes</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(outcomeCounts).map(([outcome, count]) => (
              <Badge
                key={outcome}
                variant={
                  outcome === 'success'
                    ? 'default'
                    : outcome === 'failure'
                      ? 'destructive'
                      : 'secondary'
                }
                className="text-xs"
              >
                {outcome}: {count}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <p className="text-gray-600 mb-1">Categories</p>
          <div className="flex flex-wrap gap-1">
            {categories.map((category) => (
              <Badge
                key={category}
                className={`text-xs ${getCategoryColor(category)}`}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        {services.length > 0 && (
          <div className="col-span-2">
            <p className="text-gray-600 mb-1">Services</p>
            <div className="flex flex-wrap gap-1">
              {services.map((service) => (
                <Badge key={service} variant="outline" className="text-xs">
                  {service}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary and Impact */}
      <div className="space-y-3 pt-2 border-t">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Summary</p>
          <p className="text-sm text-gray-900 leading-relaxed">
            {story.summary}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Impact</p>
          <p className="text-sm text-gray-900 leading-relaxed">
            {story.impact}
          </p>
        </div>
      </div>

      {/* Sources */}
      {uniqueSources.length > 0 && (
        <div className="pt-4 border-t">
          <Sources>
            <SourcesTrigger count={uniqueSources.length} />
            <SourcesContent>
              {uniqueSources.map((source) => (
                <Source key={source.id} citation={source} />
              ))}
            </SourcesContent>
          </Sources>
        </div>
      )}
    </div>
  )
}
