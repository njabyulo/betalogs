import type { ToolSet } from "ai";
import type { z } from "zod";
import { createAgentAdapter } from "../../adapters/ai-sdk";
import { ChatOutputParseError } from "../../domain";
import type {
  AgentAdapter,
  IChatRepository,
  IChatRepositoryOptions,
  ICreateChatRepositoryOptions,
  TChatToolOptions,
  TChatToolSet,
} from "../interfaces";
import {
  createKnowledgeBaseSearchTool,
  createRewriteQueryTool,
  createStorySearchTool,
} from "./tools/opensearch";

const DEFAULT_EMBEDDING_DIMENSION = 3072 as const;

const parseStructuredOutput = <TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  text: string
): z.infer<TSchema> => {
  const trimmed = text.trim();
  const codeBlockMatch =
    trimmed.match(/```json\s*([\s\S]*?)\s*```/i) ??
    trimmed.match(/```\s*([\s\S]*?)\s*```/);
  const jsonText = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;
  const preview = trimmed.substring(0, 300);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ChatOutputParseError(
      `Invalid JSON in chat output: ${message}. Response preview: ${preview}`
    );
  }

  const parsedResult = schema.safeParse(parsed);
  if (!parsedResult.success) {
    throw new ChatOutputParseError(
      `Chat output failed schema validation: ${parsedResult.error.message}. Response preview: ${preview}`
    );
  }

  return parsedResult.data;
};

export class ChatRepository<
  D,
  T extends ToolSet,
  TSchema extends z.ZodTypeAny,
> implements IChatRepository<TSchema> {
  private chatAgent: AgentAdapter<D, T, TSchema>;
  private schema: TSchema;

  constructor(options: IChatRepositoryOptions<D, T, TSchema>) {
    this.chatAgent = options.chatAgent;
    this.schema = options.schema;
  }

  async chat(prompt: string): Promise<z.infer<TSchema>> {
    const result = await this.chatAgent.generateText({
      prompt,
      type: "medium",
    });

    if (result.output !== undefined) {
      return result.output;
    }

    try {
      return parseStructuredOutput(this.schema, result.text);
    } catch (error) {
      if (error instanceof ChatOutputParseError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new ChatOutputParseError(`Failed to parse chat output: ${message}`);
    }
  }
}

export const createChatRepository = <TSchema extends z.ZodTypeAny>(
  options: ICreateChatRepositoryOptions<TSchema>
) => {
  const embedding = {
    ...options.embedding,
    dimension: DEFAULT_EMBEDDING_DIMENSION,
  };

  const knowledgeBaseSearchTool = createKnowledgeBaseSearchTool({
    embedding,
    opensearch: options.opensearch,
  });

  const rewriteQueryTool = createRewriteQueryTool({
    provider: options.text.provider,
    model: options.text.model,
  });

  const storySearchTool = createStorySearchTool({
    embedding,
    opensearch: options.opensearch,
  });

  const tools = ((toolOptions: Set<TChatToolOptions>): TChatToolSet => {
    const toolSet: TChatToolSet = {};

    for (const tool of toolOptions) {
      switch (tool) {
        case "knowledge-base-search":
          toolSet.knowledgeBaseSearch = knowledgeBaseSearchTool;
          break;
        case "rewrite-query":
          toolSet.rewriteQuery = rewriteQueryTool;
          break;
        case "story-search":
          toolSet.storySearch = storySearchTool;
          break;
      }
    }

    return toolSet;
  })(options.tools);

  const agentAdapter = createAgentAdapter<
    TChatToolOptions,
    TChatToolSet,
    TSchema
  >({
    instructions: options.systemPrompt,
    provider: options.text.provider,
    model: options.text.model,
    tools,
    activeModelType: options.activeModelType,
    output: {
      schema: options.schema,
    },
  });

  return new ChatRepository<TChatToolOptions, TChatToolSet, TSchema>({
    chatAgent: agentAdapter,
    schema: options.schema,
  });
};
