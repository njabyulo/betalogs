# Betalogs Agent Guide

This repository is a PNPM + Turborepo monorepo. Use the commands and
standards below when working in this workspace.

## Quick Commands

- Install deps: `pnpm install`
- Build all: `pnpm build` (runs `turbo build`)
- Dev all: `pnpm dev` (turbo dev excluding sandbox/functions)
- Lint all: `pnpm lint` (turbo lint)
- Type check all: `pnpm type-check` (turbo type-check)
- Tests all: `pnpm test` (turbo test)

### Per-package commands

- Build one package: `pnpm --filter <pkg> build`
- Lint one package: `pnpm --filter <pkg> lint`
- Type check one package: `pnpm --filter <pkg> type-check`
- Dev one package: `pnpm --filter <pkg> dev`

Packages you will likely touch:

- `@betalogs/core`
- `@betalogs/shared`
- `@betalogs/database`
- `apps/functions`
- `apps/web`
- `apps/sandbox`

### Tests (single test)

There are currently no test files checked in. When tests exist, this repo
uses Vitest (see `packages/core/vitest.config.ts#L1`). Example commands:

- Run Vitest for a package: `pnpm --filter @betalogs/core exec vitest`
- Run a single test file: `pnpm --filter @betalogs/core exec vitest path/to/foo.test.ts`
- Run a single test name: `pnpm --filter @betalogs/core exec vitest -t "test name"`

## Cursor/Copilot Rules

The repository includes Cursor rules in `.cursor/rules/`:

- `core-architecture.mdc` defines the architecture and dependency rules.
- `cursor-rules.mdc` documents how Cursor rules are stored.

Follow these Cursor rules unless explicitly instructed otherwise. Key points
from the architecture rules are summarized below.

## Architecture Rules (from Cursor)

- Core code lives in `packages/core/src/` with layers:
  - `domain/` (schemas, types, domain errors)
  - `services/` (business policy, orchestration)
  - `repositories/` (persistence boundaries, adapter composition)
  - `adapters/` (external SDKs/APIs)
- Handlers live outside core (e.g., `apps/functions/**`).

### Dependency Direction (strict)

- Handlers → Services → Repository/Adapter ports (types only)
- Repositories → Adapters (implementations) and `@betalogs/database`
- Adapters → external SDKs/APIs
- Domain types/errors can be used by all layers

### Forbidden imports

- Services must not import adapter/repository implementations or DB schema.
- Repositories must not import services or handlers.
- Adapters must not import services, repositories, or DB schema.
- Handlers must not import repositories/adapters directly.

### Factories

- Services expose `create{Feature}Service()` factories that wire dependencies.
- Repositories expose `create{Feature}Repository()` factories.
- Adapters expose `create{Feature}Adapter()` factories.
- Handlers should call service factories only.

## Code Style & Conventions

### Formatting

- Prettier settings are in `packages/config/prettier/.prettierrc`:
  - Semicolons enabled
  - Double quotes
  - 2-space indent, 80-char print width
- Match existing file style; do not reformat unrelated files.

### Imports

- Use `import type` for type-only dependencies.
- Group imports: external, internal (workspace), relative.
- Prefer workspace aliases (`@betalogs/*`) over long relative paths.

### Types & Naming

- TypeScript `strict` is enabled (`tsconfig.json#L9`).
- Ports/interfaces use `I*` naming (e.g., `IChatRepository`).
- Types use `T*`, Zod schemas use `S*`, errors end with `Error`.
- Avoid `any`; use Zod + explicit domain types.

### Domain Layer

- Owns Zod schemas, domain types, and domain errors.
- Export parse helpers (e.g., `parse*`, `safeParse*`) when useful.
- No runtime/environment dependencies.

### Services Layer

- Constructor-inject dependencies as ports (types only).
- Implement business policies and orchestration only.
- Throw domain errors only (no HTTP/status codes).

### Repositories Layer

- Implement repository ports and map DB rows to domain types.
- Normalize adapter/DB errors into domain errors.
- Do not leak ORM/SDK types in public signatures.

### Adapters Layer

- Encapsulate vendor SDKs, normalize payloads, classify retryability.
- Keep provider types private to the adapter.

### Handlers

- Parse and validate transport inputs (query/body/headers).
- Call service methods with domain-shaped inputs.
- Map domain errors to HTTP responses.

## Linting Notes

- `apps/web` uses Next.js ESLint configs (`apps/web/eslint.config.mjs`).
- Base eslint config ignores `dist`, `.next`, and `node_modules`.

## File and Rule Placement

- Cursor rules must live in `.cursor/rules/*.mdc` (kebab-case filenames).
- Do not create new rule files elsewhere without explicit instruction.
