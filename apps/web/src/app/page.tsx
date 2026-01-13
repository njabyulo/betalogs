"use client";

import { ActivityTimeline } from "~/features/story/components/ActivityTimeline";
import { CommentInput } from "~/features/story/components/CommentInput";
import { SummaryCard } from "~/features/story/components/SummaryCard";
import { useStoryChat } from "~/features/story/hooks/useStoryChat";
import { Card, CardContent } from "~/components/ui/card";

export default function Home() {
  const {
    events,
    storySummary,
    isLoading,
    handleChatSubmit,
    fullLogs,
    isLoadingFullLogs,
    fetchFullLogs,
    cacheStatus,
  } = useStoryChat();

  const handleLoadFullLogs = () => {
    if (storySummary?.queryString) {
      fetchFullLogs(storySummary.queryString);
    }
  };

  // Use full logs if available, otherwise use compressed events
  const displayEvents = fullLogs.length > 0 ? fullLogs : events;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-4xl space-y-8">
          {storySummary && (
            <Card>
              <CardContent>
                <SummaryCard story={storySummary} />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent>
              <ActivityTimeline
                events={displayEvents}
                storySummary={storySummary}
                isLoadingFullLogs={isLoadingFullLogs}
                onLoadFullLogs={handleLoadFullLogs}
                cacheStatus={cacheStatus}
                hasFullLogs={fullLogs.length > 0}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="sticky bottom-0 left-0 right-0 z-10">
        <div className="mx-auto max-w-4xl p-4">
          <CommentInput onSubmit={handleChatSubmit} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
