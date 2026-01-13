import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "utils/index": "src/utils/index.ts",
    "constants/index": "src/constants/index.ts",
    "types/index": "src/types/index.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: ["zod"],
});
