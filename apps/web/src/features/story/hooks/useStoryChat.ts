import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { useState, useEffect, useCallback } from "react";
import type { IActivityEvent, TStoryOutput } from "~/features/story/types";

interface IFullLogEvent {
  id: string;
  timestamp: string;
  level: string;
  service: string;
  message: string;
  metadata: Record<string, unknown>;
}

interface IActivityLogResponse {
  events: IFullLogEvent[];
  total: number;
  timeRange: {
    from: string;
    to: string;
  };
  pagination?: {
    page: number;
    pageSize: number;
    hasMore: boolean;
    nextCursor?: string;
  };
  cache?: {
    etag: string;
    expiresAt?: string;
  };
}

interface ICacheEntry {
  data: IActivityLogResponse;
  etag: string;
  timestamp: number;
}

// Client-side cache with 5-minute TTL
const cache = new Map<string, ICacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useStoryChat() {
  const [events, setEvents] = useState<IActivityEvent[]>([]);
  const [storySummary, setStorySummary] = useState<
    TStoryOutput["story"] | null
  >(null);
  const [fullLogs, setFullLogs] = useState<IActivityEvent[]>([]);
  const [isLoadingFullLogs, setIsLoadingFullLogs] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<"fresh" | "cached" | null>(
    null
  );

  const { sendMessage, status, error } = useChat({
    transport: new TextStreamChatTransport({ api: "/api/chat" }),
    onFinish: ({ message }) => {
      setStorySummary(null);
      setEvents([]);

      try {
        const textPart = message.parts.find(
          (part): part is { type: "text"; text: string } => part.type === "text"
        );
        const textContent = textPart?.text;
        if (!textContent) {
          throw new Error("No text content in message");
        }

        const story = JSON.parse(textContent) as TStoryOutput;
        setStorySummary(story.story);

        const newEvents: IActivityEvent[] = story.story.timeline.map(
          (entry) => ({
            id: `story-${entry.id}`,
            type: "comment" as const,
            user: {
              name: entry.service,
              initial: entry.service.charAt(0).toUpperCase(),
            },
            action: entry.action,
            content: entry.message,
            timestamp: new Date(entry.timestamp),
            citations: entry.citations,
          })
        );

        setEvents(newEvents);
        setFullLogs([]); // Reset full logs when new story is generated
        setCacheStatus(null);
      } catch (parseError) {
        console.error("Failed to parse story response:", parseError);
        const textPart = message.parts.find(
          (part): part is { type: "text"; text: string } => part.type === "text"
        );
        const textContent = textPart?.text || "";
        const textEvent: IActivityEvent = {
          id: `chat-${Date.now()}`,
          type: "comment",
          user: {
            name: "AI Assistant",
            initial: "AI",
          },
          action: "Response",
          content: textContent,
          timestamp: new Date(),
        };
        setEvents([textEvent]);
      }
    },
    onError: (error: Error) => {
      console.error("Chat error:", error);
      const errorEvent: IActivityEvent = {
        id: `error-${Date.now()}`,
        type: "comment",
        user: {
          name: "System",
          initial: "S",
        },
        action: "Error",
        content: `Failed to process request: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
      };
      setEvents([errorEvent]);
    },
  });

  useEffect(() => {
    if (status === "submitted") {
      setStorySummary(null);
      setEvents([]);
    }
  }, [status]);

  const handleChatSubmit = useCallback(
    (message: string) => {
      sendMessage({ text: message });
    },
    [sendMessage]
  );

  /**
   * Fetch full activity logs using queryString from story output
   */
  const fetchFullLogs = useCallback(
    async (queryString: string, page: number = 1, pageSize: number = 50) => {
      if (!queryString) {
        console.error("No queryString provided");
        return;
      }

      setIsLoadingFullLogs(true);
      setCacheStatus(null);

      try {
        // Check cache first
        const cacheKey = `${queryString}:${page}:${pageSize}`;
        const cached = cache.get(cacheKey);
        const now = Date.now();

        if (cached && now - cached.timestamp < CACHE_TTL) {
          // Use cached data
          setFullLogs(
            cached.data.events.map((event) => ({
              id: `full-${event.id}`,
              type: "comment" as const,
              user: {
                name: event.service,
                initial: event.service.charAt(0).toUpperCase(),
              },
              action: event.level,
              content: event.message,
              timestamp: new Date(event.timestamp),
            }))
          );
          setCacheStatus("cached");
          setIsLoadingFullLogs(false);
          return;
        }

        // Build request with ETag if available
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };
        if (cached?.etag) {
          headers["If-None-Match"] = `"${cached.etag}"`;
        }

        const url = new URL("/api/activities/search", window.location.origin);
        url.searchParams.set("query", queryString);
        url.searchParams.set("page", page.toString());
        url.searchParams.set("pageSize", pageSize.toString());

        const response = await fetch(url.toString(), {
          method: "GET",
          headers,
        });

        if (response.status === 304) {
          // Not modified - use cached data
          if (cached) {
            setFullLogs(
              cached.data.events.map((event) => ({
                id: `full-${event.id}`,
                type: "comment" as const,
                user: {
                  name: event.service,
                  initial: event.service.charAt(0).toUpperCase(),
                },
                action: event.level,
                content: event.message,
                timestamp: new Date(event.timestamp),
              }))
            );
            setCacheStatus("cached");
          }
          setIsLoadingFullLogs(false);
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch full logs: ${response.statusText}`);
        }

        const data = (await response.json()) as IActivityLogResponse;

        // Update cache
        const etag =
          response.headers.get("ETag")?.replace(/"/g, "") ||
          data.cache?.etag ||
          "";
        cache.set(cacheKey, {
          data,
          etag,
          timestamp: now,
        });

        // Clean old cache entries
        for (const [key, entry] of cache.entries()) {
          if (now - entry.timestamp >= CACHE_TTL) {
            cache.delete(key);
          }
        }

        setFullLogs(
          data.events.map((event) => ({
            id: `full-${event.id}`,
            type: "comment" as const,
            user: {
              name: event.service,
              initial: event.service.charAt(0).toUpperCase(),
            },
            action: event.level,
            content: event.message,
            timestamp: new Date(event.timestamp),
          }))
        );
        setCacheStatus("fresh");
      } catch (error) {
        console.error("Failed to fetch full logs:", error);
        setCacheStatus(null);
      } finally {
        setIsLoadingFullLogs(false);
      }
    },
    []
  );

  const isLoading = status !== "ready";

  return {
    events,
    storySummary,
    isLoading,
    handleChatSubmit,
    error,
    fullLogs,
    isLoadingFullLogs,
    fetchFullLogs,
    cacheStatus,
  };
}
