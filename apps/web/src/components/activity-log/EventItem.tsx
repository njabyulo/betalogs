'use client'

import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { FaPlus, FaFileAlt, FaEnvelope, FaComment, FaSync, FaTimes, FaStar, FaAt } from 'react-icons/fa'
import { formatDistanceToNow } from 'date-fns'
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
  type Citation,
} from './Sources'

export interface ActivityEvent {
  id: string
  type: 'file' | 'meeting' | 'comment' | 'mention' | 'rule' | 'tag' | 'assignment' | 'creation' | 'email'
  icon?: React.ReactNode
  user?: {
    name: string
    avatar?: string
    initial: string
  }
  action: string
  timestamp: Date | string
  content?: string
  details?: string
  participants?: string[]
  threadCount?: number
  email?: string
  citations?: string[]
}

interface EventItemProps {
  event: ActivityEvent
  isLast?: boolean
}

const getEventIcon = (type: ActivityEvent['type']) => {
  switch (type) {
    case 'file':
      return <FaPlus className="h-4 w-4" />
    case 'meeting':
      return <FaFileAlt className="h-4 w-4" />
    case 'comment':
      return <FaEnvelope className="h-4 w-4" />
    case 'mention':
      return <FaComment className="h-4 w-4" />
    case 'rule':
      return <FaSync className="h-4 w-4" />
    case 'tag':
      return <FaPlus className="h-4 w-4" />
    case 'assignment':
      return <FaTimes className="h-4 w-4" />
    case 'creation':
      return <FaStar className="h-4 w-4" />
    case 'email':
      return <FaAt className="h-4 w-4" />
    default:
      return null
  }
}

export function EventItem({ event, isLast }: EventItemProps) {
  const timestamp =
    typeof event.timestamp === 'string'
      ? new Date(event.timestamp)
      : event.timestamp

  // Format time ago, handling invalid dates
  let timeAgo = 'just now'
  try {
    if (!isNaN(timestamp.getTime())) {
      timeAgo = formatDistanceToNow(timestamp, { addSuffix: true })
    }
  } catch {
    // Fallback if date-fns fails
    timeAgo = 'recently'
  }

  return (
    <div className="relative flex gap-4 pb-6">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-5 top-10 h-full w-[1px] bg-gray-200" />
      )}

      {/* Icon circle */}
      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        {event.icon || getEventIcon(event.type)}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          {event.user && (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-gray-200 text-xs">
                {event.user.initial}
              </AvatarFallback>
            </Avatar>
          )}
          <span className="text-sm font-medium">{event.user?.name}</span>
          <span className="text-sm text-gray-600">{event.action}</span>
          <span className="text-xs text-gray-400">• {timeAgo}</span>
        </div>

        {event.details && (
          <p className="text-sm text-gray-600">{event.details}</p>
        )}

        {event.content && (
          <p className="text-sm text-gray-700">{event.content}</p>
        )}

        {event.participants && event.participants.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {event.participants.slice(0, 3).map((participant, idx) => (
                <Avatar key={idx} className="h-6 w-6 border-2 border-white">
                  <AvatarFallback className="bg-gray-200 text-xs">
                    {participant}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {event.participants.length > 3 && (
              <span className="text-xs text-gray-500">
                and {event.participants.length - 3} others
              </span>
            )}
          </div>
        )}

        {event.threadCount !== undefined && event.threadCount > 0 && (
          <button className="text-xs text-blue-600 hover:underline">
            View {event.threadCount} more {event.threadCount === 1 ? 'reply' : 'replies'}
          </button>
        )}

        {event.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Add to this activity by mailing to {event.email}</span>
            <button className="text-blue-600 hover:underline">Copy</button>
          </div>
        )}

        {/* Sources */}
        {event.citations && event.citations.length > 0 && (
          <div className="mt-2">
            <Sources>
              <SourcesTrigger count={event.citations.length} />
              <SourcesContent>
                {event.citations.map((citation, idx) => {
                  // Parse citation format like [id: X] or just use the citation string
                  const citationMatch = citation.match(/\[id:\s*([^\]]+)\]/)
                  const citationId = citationMatch
                    ? citationMatch[1]
                    : citation.replace(/[\[\]]/g, '')
                  const citationObj: Citation = {
                    id: citationId,
                    title: citationId,
                    sourceId: citationId,
                    viewLink: `#event-${event.id}`,
                  }
                  return <Source key={idx} citation={citationObj} />
                })}
              </SourcesContent>
            </Sources>
          </div>
        )}
      </div>
    </div>
  )
}
