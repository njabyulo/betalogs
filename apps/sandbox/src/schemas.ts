import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Story Mode Output Schema
export const StoryTimelineEntrySchema = z.object({
  timestamp: z.string().describe("ISO timestamp"),
  level: z.string().describe('Log level or "unknown"'),
  category: z
    .enum([
      "tech",
      "logistics",
      "finance",
      "security",
      "support",
      "product",
      "ops",
      "hr",
      "unknown",
    ])
    .describe("Event category"),
  service: z.string().describe("Service name or source"),
  action: z.string().describe('Action taken or "unknown"'),
  outcome: z
    .enum(["success", "failure", "unknown"])
    .describe("Outcome of the event"),
  message: z.string().describe("Short message describing the event"),
  id: z.string().describe("Event ID"),
  citations: z.array(z.string()).describe("Citation references like [id: X]"),
});

export const StoryRawEventSchema = z.object({
  id: z.string().describe("Event ID"),
  timestamp: z.string().describe("ISO timestamp"),
  source: z.string().describe("Event source"),
  payload: z.any().describe("Full event object as JSON"),
  citations: z.array(z.string()).describe("Citation references"),
});

export const StoryTimeRangeSchema = z.object({
  from: z.string().nullable().describe("ISO timestamp or null"),
  to: z.string().nullable().describe("ISO timestamp or null"),
});

export const StoryOutputSchema = z.object({
  story: z.object({
    identifier: z.string().describe("The identifier used for the search"),
    identifierType: z
      .enum([
        "orderId",
        "shipmentId",
        "ticketId",
        "traceId",
        "requestId",
        "checkoutId",
        "userId",
        "email",
        "emailHash",
      ])
      .describe("Type of identifier"),
    timeRange: StoryTimeRangeSchema,
    timeline: z
      .array(StoryTimelineEntrySchema)
      .describe("Chronological events"),
    rawEvents: z
      .array(StoryRawEventSchema)
      .describe("Complete event data with full metadata"),
    summary: z.string().describe("2-3 sentence summary with citations"),
    impact: z.string().describe("Key outcomes with citations"),
    duration: z.string().nullable().describe("Human-readable duration or null"),
    eventCount: z.number().int().min(0).describe("Total number of events"),
    queryString: z
      .string()
      .describe(
        "Base64-encoded query string for fetching full activity logs via REST API"
      ),
  }),
});

// COE Mode Output Schema
export const COEScopeSchema = z.object({
  tenant: z.string().optional().describe("Tenant identifier"),
  timeRange: z.object({
    from: z.string().describe("ISO timestamp"),
    to: z.string().describe("ISO timestamp"),
  }),
  primaryKeys: z
    .object({
      object_id: z.string().optional(),
      trace_id: z.string().optional(),
      request_id: z.string().optional(),
    })
    .describe("Primary correlation keys"),
});

export const COEFactsSchema = z.object({
  impactMitigated: z
    .enum(["true", "false", "unknown"])
    .describe("Whether impact has been mitigated"),
  evidenceRefs: z.array(z.string()).describe("Evidence citation references"),
});

export const COEImpactSchema = z.object({
  statement: z.string().describe("Cited facts about impact"),
  quant: z.object({
    customersImpacted: z
      .union([z.number(), z.literal("unknown")])
      .describe("Number of customers impacted"),
    transactionsImpacted: z
      .union([z.number(), z.literal("unknown")])
      .describe("Number of transactions impacted"),
  }),
  citations: z.array(z.string()).describe("Citation references"),
});

export const COETimelineEntrySchema = z.object({
  ts: z.string().describe("ISO timestamp"),
  event: z.string().describe("What happened"),
  citations: z.array(z.string()).describe("Citation references"),
});

export const COETimelineSchema = z.object({
  entries: z.array(COETimelineEntrySchema),
});

export const COEMetricSchema = z.object({
  name: z.string().describe("Metric name"),
  value: z.string().describe("Metric value"),
  citations: z.array(z.string()).describe("Citation references"),
});

export const COEMetricsSchema = z.object({
  observed: z.array(COEMetricSchema).describe("Metrics that were observed"),
  missing: z.array(z.string()).describe("Metrics that were needed but missing"),
});

export const COEIncidentQuestionsSchema = z.object({
  detection: z.array(z.string()).describe("Detection-related questions"),
  diagnosis: z.array(z.string()).describe("Diagnosis-related questions"),
  mitigation: z.array(z.string()).describe("Mitigation-related questions"),
});

export const COEFiveWhysEntrySchema = z.object({
  why: z.number().int().min(1).describe("Why number (1, 2, 3, etc.)"),
  question: z.string().describe("Why question"),
  answer: z.string().describe('Evidence-based answer or "Unknown"'),
  citations: z.array(z.string()).describe("Citation references"),
});

export const COEActionItemSchema = z.object({
  priority: z.enum(["P0", "P1", "P2"]).describe("Priority level"),
  owner: z.string().describe('Owner name or "unknown"'),
  dueDate: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("unknown")])
    .describe('Due date in YYYY-MM-DD format or "unknown"'),
  item: z.string().describe("Specific action item"),
  citations: z.array(z.string()).describe("Citation references"),
});

export const COERelatedItemSchema = z.object({
  type: z.enum(["doc", "incident", "coe"]).describe("Type of related item"),
  ref: z.string().describe("Reference ID or URL"),
  citations: z.array(z.string()).describe("Citation references"),
});

export const COEIncidentSummarySchema = z.object({
  text: z.string().describe("Incident summary text with citations"),
  citations: z.array(z.string()).describe("Citation references"),
});

export const COESectionsSchema = z.object({
  impact: COEImpactSchema,
  timeline: COETimelineSchema,
  metrics: COEMetricsSchema,
  incidentQuestions: COEIncidentQuestionsSchema,
  fiveWhys: z.array(COEFiveWhysEntrySchema),
  actionItems: z.array(COEActionItemSchema),
  relatedItems: z.array(COERelatedItemSchema),
  incidentSummary: COEIncidentSummarySchema,
});

export const COEOutputSchema = z.object({
  coe: z.object({
    scope: COEScopeSchema,
    facts: COEFactsSchema,
    sections: COESectionsSchema,
  }),
});

// Helper function to convert Zod schema to JSON Schema format
export function schemaToJsonString(schema: z.ZodTypeAny): string {
  const jsonSchema = zodToJsonSchema(schema as any, {
    target: "openApi3",
    $refStrategy: "none",
  });
  return JSON.stringify(jsonSchema, null, 2);
}

// Helper function to generate example values from JSON Schema
function generateExampleFromJsonSchema(jsonSchema: any): unknown {
  // Handle objects with properties
  if (jsonSchema.type === "object" && jsonSchema.properties) {
    const example: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(jsonSchema.properties)) {
      example[key] = generateExampleFromJsonSchema(value as any);
    }
    return example;
  }

  // Handle arrays
  if (jsonSchema.type === "array") {
    if (jsonSchema.items) {
      return [generateExampleFromJsonSchema(jsonSchema.items)];
    }
    return [];
  }

  // Handle enums
  if (jsonSchema.enum) {
    const enumValues = jsonSchema.enum as unknown[];
    if (enumValues.length === 1) return enumValues[0];
    return `<${enumValues.join("|")}>`;
  }

  // Handle oneOf/anyOf (unions)
  if (jsonSchema.oneOf || jsonSchema.anyOf) {
    const options = (jsonSchema.oneOf || jsonSchema.anyOf) as any[];
    // Find first non-null option
    for (const option of options) {
      if (option.type !== "null") {
        return generateExampleFromJsonSchema(option);
      }
    }
    return null;
  }

  // Handle nullable
  if (jsonSchema.nullable === true) {
    const example = generateExampleFromJsonSchema({
      ...jsonSchema,
      nullable: false,
    });
    if (typeof example === "string") {
      return `${example}|null`;
    }
    return example;
  }

  // Handle strings
  if (jsonSchema.type === "string") {
    const description = jsonSchema.description as string | undefined;
    if (description) {
      // Extract example patterns from description
      if (description.includes("ISO")) return "<ISO>";
      if (description.includes("timestamp")) return "<ISO>";
      if (description.includes("or")) {
        const match = description.match(/<([^>]+)>/);
        if (match) return `<${match[1]}>`;
      }
      return `<${description.toLowerCase().replace(/\s+/g, "_")}>`;
    }
    // Check for format hints
    if (jsonSchema.format === "date-time") return "<ISO>";
    return "<...>";
  }

  // Handle numbers
  if (jsonSchema.type === "number" || jsonSchema.type === "integer") {
    return jsonSchema.type === "integer" ? 0 : "<number>";
  }

  // Handle booleans
  if (jsonSchema.type === "boolean") {
    return "<true|false>";
  }

  // Handle default values
  if (jsonSchema.default !== undefined) {
    return jsonSchema.default;
  }

  // Handle examples
  if (jsonSchema.examples && jsonSchema.examples.length > 0) {
    return jsonSchema.examples[0];
  }

  // Default fallback
  return "<unknown>";
}

// Helper function to get a formatted JSON example from schema
export function getSchemaJsonExample(schemaName: "story" | "coe"): string {
  const schema = schemaName === "story" ? StoryOutputSchema : COEOutputSchema;
  // Convert Zod schema to JSON Schema first
  const jsonSchema = zodToJsonSchema(schema as any, {
    target: "openApi3",
    $refStrategy: "none",
  });
  // Generate example from JSON Schema (much simpler!)
  const example = generateExampleFromJsonSchema(jsonSchema);
  return JSON.stringify(example, null, 2);
}

// Helper function to get a concrete, realistic example for prompts
// This generates actual example values instead of placeholders
export function getConcreteSchemaExample(schemaName: "story" | "coe"): string {
  if (schemaName === "story") {
    const example: z.infer<typeof StoryOutputSchema> = {
      story: {
        identifier: "req_abc123",
        identifierType: "requestId",
        timeRange: {
          from: "2024-06-19T10:00:00Z",
          to: "2024-06-19T10:00:12Z",
        },
        timeline: [
          {
            id: "1",
            timestamp: "2024-06-19T10:00:00Z",
            level: "ERROR",
            category: "tech",
            service: "checkout",
            action: "payment_processing",
            outcome: "failure",
            message:
              "Checkout failed for user alice@example.com. Payment provider timeout after 3 attempts.",
            citations: ["[id: 1]"],
          },
        ],
        rawEvents: [
          {
            id: "1",
            timestamp: "2024-06-19T10:00:00Z",
            source: "checkout",
            payload: {
              request_id: "req_abc123",
              user_id: "user_alice_789",
              status_code: 500,
            },
            citations: ["[id: 1]"],
          },
        ],
        summary:
          "The checkout process for request req_abc123 failed due to a payment provider timeout. [id: 1]",
        impact:
          "The user alice@example.com experienced a failed checkout, potentially leading to a lost sale. [id: 1]",
        duration: "12.5 seconds",
        eventCount: 1,
      },
    };
    return JSON.stringify(example, null, 2);
  } else {
    // For COE, use the generic generator for now
    return getSchemaJsonExample("coe");
  }
}

// Export type inference helpers
export type StoryOutput = z.infer<typeof StoryOutputSchema>;
export type COEOutput = z.infer<typeof COEOutputSchema>;
export type StoryTimelineEntry = z.infer<typeof StoryTimelineEntrySchema>;
export type COEActionItem = z.infer<typeof COEActionItemSchema>;
