import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import type { ICitation, IUseEventItemProps } from "~/features/story/types";

export function useEventItem({ event }: IUseEventItemProps) {
  const timestamp = useMemo(
    () =>
      typeof event.timestamp === "string"
        ? new Date(event.timestamp)
        : event.timestamp,
    [event.timestamp]
  );

  const timeAgo = useMemo(() => {
    try {
      if (!isNaN(timestamp.getTime())) {
        return formatDistanceToNow(timestamp, { addSuffix: true });
      }
    } catch {
      return "recently";
    }
    return "just now";
  }, [timestamp]);

  const citations = useMemo(() => {
    if (!event.citations || event.citations.length === 0) return null;
    return event.citations.map((citation) => {
      const citationMatch = citation.match(/\[id:\s*([^\]]+)\]/);
      const citationId = citationMatch
        ? citationMatch[1]
        : citation.replace(/[\[\]]/g, "");
      return {
        id: citationId,
        title: citationId,
        sourceId: citationId,
        viewLink: `#event-${event.id}`,
      } as ICitation;
    });
  }, [event.citations, event.id]);

  return {
    timestamp,
    timeAgo,
    citations,
  };
}
