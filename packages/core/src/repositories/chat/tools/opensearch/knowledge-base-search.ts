import { tool } from "ai";
import { z } from "zod";
import { createSearchAdapter } from "../../../../adapters";

export interface ICreateKnowledgeBaseSearchToolOptions {
  embedding: {
    provider: "google";
    model: "gemini-embedding-001";
    dimension: 3072;
  };
  opensearch: {
    node: string;
    index: string;
    username?: string;
    password?: string;
  };
}

export const createKnowledgeBaseSearchTool = (
  options: ICreateKnowledgeBaseSearchToolOptions
) => {
  const search = createSearchAdapter({
    embedding: options.embedding,
    opensearch: options.opensearch,
  });

  return tool({
    description:
      "Semantic search over the indexed knowledge base in OpenSearch. Use this to fetch relevant passages before answering.",
    inputSchema: z.object({
      query: z.string().describe("The user question or search query"),
      k: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe("How many results to return"),
    }),
    execute: async ({ query, k }) => {
      return await search.knnSearch({ query, k: k ?? 8 });
    },
  });
};
