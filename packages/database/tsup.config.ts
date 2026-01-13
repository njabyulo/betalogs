import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    connection: "src/connection.ts",
    "schema/index": "src/schema/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  external: ["drizzle-orm", "postgres"],
});
