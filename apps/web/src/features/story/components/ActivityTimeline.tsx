"use client";

import { memo } from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { EventItem } from "~/features/story/components/EventItem";
import type { IActivityTimelineProps } from "~/features/story/types";
import { Loader2 } from "lucide-react";

function ActivityTimelineComponent({
  events,
  storySummary,
  isLoadingFullLogs = false,
  onLoadFullLogs,
  cacheStatus,
  hasFullLogs = false,
}: IActivityTimelineProps) {
  const showLoadButton =
    storySummary?.queryString && !hasFullLogs && events.length > 0;

  return (
    <div className="space-y-4">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between">
          <CardTitle>Activity Log</CardTitle>
          {showLoadButton && (
            <Button
              onClick={onLoadFullLogs}
              disabled={isLoadingFullLogs}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              {isLoadingFullLogs ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load Full Logs"
              )}
            </Button>
          )}
          {hasFullLogs && cacheStatus && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              {cacheStatus === "cached" && (
                <span className="text-blue-600">(Cached)</span>
              )}
              {cacheStatus === "fresh" && (
                <span className="text-green-600">(Fresh)</span>
              )}
            </div>
          )}
        </div>
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
              <>
                {hasFullLogs && (
                  <div className="px-4 py-2 bg-blue-50 border-b text-xs text-blue-700">
                    Showing full activity logs ({events.length} events)
                  </div>
                )}
                {events.map((event, index) => (
                  <EventItem
                    key={event.id}
                    event={event}
                    isLast={index === events.length - 1}
                  />
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </div>
  );
}

export const ActivityTimeline = memo(ActivityTimelineComponent);
