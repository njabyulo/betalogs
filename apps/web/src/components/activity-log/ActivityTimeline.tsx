'use client'

import { ScrollArea } from '~/components/ui/scroll-area'
import { Separator } from '~/components/ui/separator'
import { EventItem, type ActivityEvent } from './EventItem'

interface ActivityTimelineProps {
  events: ActivityEvent[]
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Activity Log</h2>
      </div>

      <Separator />

      <ScrollArea className="h-[600px]">
        <div className="space-y-0">
          {events.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              No activity to display. Submit a query to see timeline events.
            </div>
          ) : (
            events.map((event, index) => (
              <EventItem
                key={event.id}
                event={event}
                isLast={index === events.length - 1}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
