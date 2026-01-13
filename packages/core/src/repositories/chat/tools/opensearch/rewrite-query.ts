import { tool } from "ai";
import { z } from "zod";
import { createTextAdapter } from "../../../../adapters";

export interface ICreateRewriteQueryToolOptions {
  provider: "google";
  model: {
    low: "gemini-2.5-flash-lite";
    medium: "gemini-2.5-flash";
    high: "gemini-2.5-flash-pro";
  };
}

export const createRewriteQueryTool = (
  options: ICreateRewriteQueryToolOptions
) => {
  const textAdapter = createTextAdapter({
    provider: options.provider,
    model: options.model,
  });

  return tool({
    description:
      "Rewrite the following text into a concise, keyword-rich OpenSearch query string. Return **only** the optimized query string (no JSON, no explanations, no quotes). Preserve quoted phrases exactly, keep important identifiers (names, IDs, emails, dates, error codes), remove filler words, and add boolean operators (`AND`, `OR`, `-`) where helpful.",
    inputSchema: z.object({
      query: z.string().describe("The user question or search query"),
    }),
    execute: async ({ query }) => {
      return await textAdapter.generateText({
        system:
          "Rewrite the following text into a concise, keyword-rich OpenSearch query string. Return **only** the optimized query string (no JSON, no explanations, no quotes). Preserve quoted phrases exactly, keep important identifiers (names, IDs, emails, dates, error codes), remove filler words, and add boolean operators (`AND`, `OR`, `-`) where helpful.",
        prompt: query,
        type: "low",
      });
    },
  });
};
