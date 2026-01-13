"use client";

import { memo } from "react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  FaPlus,
  FaFileAlt,
  FaEnvelope,
  FaComment,
  FaSync,
  FaTimes,
  FaStar,
  FaAt,
} from "react-icons/fa";
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "~/features/story/components/Sources";
import { useEventItem } from "~/features/story/hooks/useEventItem";
import type {
  IEventItemProps,
  TActivityEventType,
} from "~/features/story/types";

const getEventIcon = (type: TActivityEventType) => {
  switch (type) {
    case "file":
      return <FaPlus className="h-4 w-4" />;
    case "meeting":
      return <FaFileAlt className="h-4 w-4" />;
    case "comment":
      return <FaEnvelope className="h-4 w-4" />;
    case "mention":
      return <FaComment className="h-4 w-4" />;
    case "rule":
      return <FaSync className="h-4 w-4" />;
    case "tag":
      return <FaPlus className="h-4 w-4" />;
    case "assignment":
      return <FaTimes className="h-4 w-4" />;
    case "creation":
      return <FaStar className="h-4 w-4" />;
    case "email":
      return <FaAt className="h-4 w-4" />;
    default:
      return null;
  }
};

function EventItemComponent({ event, isLast }: IEventItemProps) {
  const { timeAgo, citations } = useEventItem({ event });

  return (
    <div className="relative flex gap-4 pb-6">
      {!isLast && (
        <div className="absolute left-5 top-10 h-full w-[1px] bg-gray-200" />
      )}

      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        {event.icon || getEventIcon(event.type)}
      </div>

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
          <Button variant="link" className="h-auto p-0 text-xs text-blue-600">
            View {event.threadCount} more{" "}
            {event.threadCount === 1 ? "reply" : "replies"}
          </Button>
        )}

        {event.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Add to this activity by mailing to {event.email}</span>
            <Button variant="link" className="h-auto p-0 text-blue-600">
              Copy
            </Button>
          </div>
        )}

        {citations && citations.length > 0 && (
          <div className="mt-2">
            <Sources>
              <SourcesTrigger count={citations.length} />
              <SourcesContent>
                {citations.map((citation, idx) => (
                  <Source key={idx} citation={citation} />
                ))}
              </SourcesContent>
            </Sources>
          </div>
        )}
      </div>
    </div>
  );
}

export const EventItem = memo(EventItemComponent);
