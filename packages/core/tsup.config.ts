import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'services/index': 'src/services/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  external: ['@opensearch-project/opensearch', '@ai-sdk/google', 'ai', 'zod'],
})
