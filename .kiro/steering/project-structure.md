---
inclusion: always
---

# Project Structure Guidelines

## Repository Structure

This project follows a monorepo structure with clear separation of concerns:

```
├── apps/
│   ├── functions/          # Hono-based API functions (Lambda)
│   └── web/                # Next.js frontend application
├── packages/
│   ├── core/               # Core business logic
│   ├── database/           # Drizzle ORM schemas and migrations
│   └── shared/             # Shared utilities and types
└── infra/                  # SST infrastructure definitions
    ├── config/             # Configuration (env-specific)
    ├── network/            # API Gateway and routes
    └── storage/            # Database resources
```

## Directory Guidelines

- **apps/**: Application entry points only
- **packages/**: Reusable code that can be shared across apps
- **infra/**: Infrastructure as code, environment-specific configurations
- Keep dependencies flowing downward (apps depend on packages, not vice versa)
- Use absolute imports with path mapping for clean imports across the monorepo

## File Organization

- Group related functionality in feature-based folders
- Keep components, hooks, and utilities close to where they're used
- Use index files for clean exports
- Separate concerns: UI components, business logic, data access
