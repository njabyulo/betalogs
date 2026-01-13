import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "services/index": "src/services/index.ts",
    "domain/index": "src/domain/index.ts",
  },
  format: ["cjs", "esm"],
  dts: {
    resolve: true,
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  external: ["@opensearch-project/opensearch", "@ai-sdk/google", "ai", "zod"],
});
