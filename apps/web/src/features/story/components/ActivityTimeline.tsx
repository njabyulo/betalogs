'use client'

import { memo } from 'react'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Separator } from '~/components/ui/separator'
import { CardHeader, CardTitle, CardContent } from '~/components/ui/card'
import { EventItem } from '~/features/story/components/EventItem'
import type { IActivityTimelineProps } from '~/features/story/types'

function ActivityTimelineComponent({ events }: IActivityTimelineProps) {
  return (
    <div className="space-y-4">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Activity Log</CardTitle>
      </CardHeader>

      <Separator />

      <CardContent className="px-0">
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
      </CardContent>
    </div>
  )
}

export const ActivityTimeline = memo(ActivityTimelineComponent)
