import { tool } from "ai";
import { z } from "zod";
import { createSearchAdapter } from "../../../../adapters";
import {
  compressByPattern,
  generateQueryString,
  MAX_EVENTS_IN_OUTPUT,
  selectRepresentativeEvents,
  sortEventsByTimestamp,
  type TStorySearchEvent,
  type TStorySearchEventWithMetadata,
} from "./story-search-utils";

export interface ICreateStorySearchToolOptions {
  embedding: {
    provider: "google";
    model: "gemini-embedding-001";
    dimension: 3072 | 768;
  };
  opensearch: {
    node: string;
    index: string;
    username?: string;
    password?: string;
  };
}

type TStorySearchToolOutput = {
  events: TStorySearchEvent[];
  total: number;
  queryString?: string;
};

const normalizeOutput = (output: unknown): TStorySearchToolOutput => {
  if (Array.isArray(output)) {
    return { events: output as TStorySearchEvent[], total: output.length };
  }

  if (output && typeof output === "object") {
    const record = output as {
      events?: unknown;
      total?: unknown;
      queryString?: unknown;
    };

    if (Array.isArray(record.events) && typeof record.total === "number") {
      const queryString =
        typeof record.queryString === "string" ? record.queryString : undefined;
      return {
        events: record.events as TStorySearchEvent[],
        total: record.total,
        queryString,
      };
    }
  }

  throw new Error("Invalid story search tool output shape.");
};

export const createStorySearchTool = (
  options: ICreateStorySearchToolOptions
) => {
  const search = createSearchAdapter({
    embedding: options.embedding,
    opensearch: options.opensearch,
  });

  return tool({
    description:
      "Exact search for all events related to a specific identifier. Common types include: orderId, shipmentId, ticketId, traceId, requestId, email, checkoutId, userId, emailHash. Use this when the user provides a specific identifier to retrieve the complete timeline of events. Returns compressed/refined events optimized for story generation (pattern-based compression reduces token usage by 60-80%) and includes a queryString field (base64-encoded) that can be used to fetch full activity logs via REST API. The output includes events, queryString, and statistics.",
    inputSchema: z.object({
      identifier: z
        .string()
        .describe(
          "The identifier value to search for (e.g., \"order_ord123\", \"req_abc456\", \"alice@example.com\")"
        ),
      identifierType: z
        .string()
        .describe(
          "The type of identifier being searched (e.g., \"orderId\", \"requestId\", \"email\", etc.)"
        ),
    }),
    execute: async ({ identifier, identifierType }) => {
      const results = await search.exactSearch({
        identifier,
        identifierType,
      });

      const fullResults: TStorySearchEventWithMetadata[] = results.map(
        (result) => ({
          id: result.id,
          timestamp: result.timestamp,
          level: result.level,
          service: result.service,
          message: result.message,
          metadata: result.metadata,
        })
      );

      const sortedResults = sortEventsByTimestamp(fullResults);
      const queryString = generateQueryString(identifier, identifierType);
      const events: TStorySearchEvent[] = sortedResults.map((result) => ({
        id: result.id,
        timestamp: result.timestamp,
        level: result.level,
        service: result.service,
        message: result.message,
      }));

      return {
        events,
        queryString,
        total: sortedResults.length,
      };
    },
    toModelOutput: async ({ output }) => {
      const normalizedOutput = normalizeOutput(output);
      const events = sortEventsByTimestamp(normalizedOutput.events);
      const queryString = normalizedOutput.queryString;
      const totalEvents = normalizedOutput.total;

      const { patterns, unique } = compressByPattern(events);
      const selectedEvents = selectRepresentativeEvents(events);

      const levelDistribution = events.reduce((accumulator, event) => {
        accumulator[event.level] = (accumulator[event.level] || 0) + 1;
        return accumulator;
      }, {} as Record<string, number>);

      const serviceDistribution = events.reduce((accumulator, event) => {
        accumulator[event.service] = (accumulator[event.service] || 0) + 1;
        return accumulator;
      }, {} as Record<string, number>);

      const criticalCount = events.filter(
        (event) =>
          event.level === "error" ||
          event.level === "critical" ||
          event.level === "failure"
      ).length;

      const timeRange = {
        start: events[0]?.timestamp,
        end: events[events.length - 1]?.timestamp,
      };

      if (totalEvents <= MAX_EVENTS_IN_OUTPUT) {
        return {
          type: "text" as const,
          value: JSON.stringify({
            total: totalEvents,
            events: selectedEvents,
            queryString,
            statistics: {
              levelDistribution,
              serviceDistribution,
              criticalCount,
            },
          }),
        };
      }

      return {
        type: "text" as const,
        value: JSON.stringify({
          total: totalEvents,
          shown: selectedEvents.length,
          selection:
            "pattern-compressed (critical events + patterns + temporal distribution)",
          timeRange,
          events: selectedEvents,
          patterns: patterns.map((pattern) => ({
            pattern: pattern.pattern,
            count: pattern.count,
            sample: {
              id: pattern.sample.id,
              timestamp: pattern.sample.timestamp,
              level: pattern.sample.level,
              service: pattern.sample.service,
              message: pattern.sample.message,
            },
          })),
          summary: {
            omitted: totalEvents - selectedEvents.length,
            patternsCompressed: patterns.length,
            uniqueEvents: unique.length,
            note: `Selected ${selectedEvents.length} representative events from ${totalEvents} total. Includes all critical events, pattern summaries, and evenly distributed samples across timeline.`,
          },
          statistics: {
            levelDistribution,
            serviceDistribution,
            criticalCount,
          },
          queryString,
        }),
      };
    },
  });
};
