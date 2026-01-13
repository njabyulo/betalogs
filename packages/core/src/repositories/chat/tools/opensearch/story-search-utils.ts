import { createHash } from "crypto";

export type TStorySearchEvent = {
  id: string;
  timestamp: string;
  level: string;
  service: string;
  message: string;
};

export type TStorySearchEventWithMetadata = TStorySearchEvent & {
  metadata?: Record<string, unknown>;
};

type TPatternSummary = {
  pattern: string;
  count: number;
  sample: TStorySearchEvent;
  samples: TStorySearchEvent[];
};

export const MAX_EVENTS_IN_OUTPUT = 30;

const extractPattern = (message: string): string => {
  return message
    .replace(
      /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi,
      "<uuid>"
    )
    .replace(/\b[0-9a-f]{32,}\b/gi, "<hash>")
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, "<timestamp>")
    .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, "<email>")
    .replace(/\b(ord_|req_|ship_|ticket_|trace_|checkout_|user_)[a-z0-9_]+\b/gi, "<id>")
    .replace(/\b\d+\.\d+\.\d+\.\d+\b/g, "<ip>")
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "<ip>")
    .replace(/\b\d+\b/g, "<number>");
};

export const compressByPattern = (events: TStorySearchEvent[]) => {
  const patternMap = new Map<string, TStorySearchEvent[]>();
  const uniqueEvents: TStorySearchEvent[] = [];

  for (const event of events) {
    const pattern = extractPattern(event.message);
    const existing = patternMap.get(pattern);

    if (existing) {
      existing.push(event);
    } else {
      patternMap.set(pattern, [event]);
    }
  }

  const patterns: TPatternSummary[] = [];

  for (const [pattern, patternEvents] of patternMap.entries()) {
    if (patternEvents.length >= 3) {
      const samples = [
        patternEvents[0]!,
        patternEvents[Math.floor(patternEvents.length / 2)]!,
        patternEvents[patternEvents.length - 1]!,
      ].filter(Boolean);
      patterns.push({
        pattern,
        count: patternEvents.length,
        sample: patternEvents[0]!,
        samples,
      });
    } else {
      uniqueEvents.push(...patternEvents);
    }
  }

  return { patterns, unique: uniqueEvents };
};

export const selectRepresentativeEvents = (events: TStorySearchEvent[]) => {
  if (events.length <= MAX_EVENTS_IN_OUTPUT) {
    return events;
  }

  const { patterns, unique } = compressByPattern(events);

  const critical = events.filter(
    (event) =>
      event.level === "error" ||
      event.level === "critical" ||
      event.level === "failure"
  );
  const recent = events.slice(-3);
  const early = events.slice(0, 3);

  const selectedIds = new Set<string>();
  const selected: TStorySearchEvent[] = [];

  const addIfNotSelected = (event: TStorySearchEvent) => {
    if (!selectedIds.has(event.id) && selected.length < MAX_EVENTS_IN_OUTPUT) {
      selectedIds.add(event.id);
      selected.push(event);
    }
  };

  critical.forEach(addIfNotSelected);
  early.forEach(addIfNotSelected);

  for (const pattern of patterns) {
    if (selected.length >= MAX_EVENTS_IN_OUTPUT) break;
    pattern.samples.forEach(addIfNotSelected);
  }

  for (const event of unique) {
    if (selected.length >= MAX_EVENTS_IN_OUTPUT) break;
    addIfNotSelected(event);
  }

  recent.forEach(addIfNotSelected);

  const remaining = MAX_EVENTS_IN_OUTPUT - selected.length;
  if (remaining > 0) {
    const middleStart = Math.floor(events.length * 0.3);
    const middleEnd = Math.floor(events.length * 0.7);
    const middleEvents = events.slice(middleStart, middleEnd);
    const step = Math.max(1, Math.floor(middleEvents.length / remaining));

    for (
      let index = 0;
      index < middleEvents.length && selected.length < MAX_EVENTS_IN_OUTPUT;
      index += step
    ) {
      addIfNotSelected(middleEvents[index]!);
    }
  }

  return selected.slice(0, MAX_EVENTS_IN_OUTPUT);
};

export const sortEventsByTimestamp = (events: TStorySearchEvent[]) => {
  return [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
};

export const generateQueryString = (
  identifier: string,
  identifierType: string
): string => {
  const queryObj = {
    identifier,
    identifierType,
    timestamp: new Date().toISOString(),
  };

  const cacheKey = createHash("sha256")
    .update(JSON.stringify({ identifier, identifierType }))
    .digest("hex")
    .substring(0, 16);

  const queryWithCache = {
    ...queryObj,
    cacheKey,
  };

  return Buffer.from(JSON.stringify(queryWithCache)).toString("base64");
};
