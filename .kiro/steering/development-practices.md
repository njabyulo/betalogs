---
inclusion: always
---

# Development Practices

## Code Quality Standards

### TypeScript
- Use strict TypeScript configuration
- Prefer type inference over explicit typing when clear
- Use branded types for domain-specific values
- Implement proper error handling with Result types or custom error classes

### Zod Schema Guidelines
- Define schemas with 'S' prefix (e.g., `SCreateUser`, `SLoginRequest`)
- Use Zod for all API input/output validation
- Infer TypeScript types from Zod schemas: `type TUser = z.infer<typeof SUser>`
- Place schemas close to their usage or in shared schema files
- Use `.transform()` for data normalization and `.refine()` for custom validation

### Code Organization
- Follow feature-based folder structure within each package
- Use barrel exports (index.ts) for clean imports
- Keep functions pure and side-effect free when possible
- Implement proper separation of concerns

### Naming Conventions
- Use PascalCase for components and classes
- Use camelCase for functions, variables, and methods
- Use SCREAMING_SNAKE_CASE for constants
- Use kebab-case for file names and URLs
- **Types**: Prefix with 'T' (e.g., `TUser`, `TPaymentData`)
- **Interfaces**: Prefix with 'I' (e.g., `IUserService`, `IPaymentProcessor`)
- **Zod Schemas**: Prefix with 'S' (e.g., `SCreateUser`, `SPaymentRequest`)

## Testing Strategy

### Testing Frameworks
- **Vitest**: Unit and integration testing framework
- **Playwright**: End-to-end testing for web applications
- Use Vitest for all business logic testing in `packages/core/`
- Use Playwright for critical user flow testing in `apps/web/`

### Test Organization
- Unit tests: Test individual functions and classes in isolation
- Integration tests: Test API endpoints and service interactions
- E2E tests: Test complete user workflows with Playwright
- Follow AAA pattern: Arrange, Act, Assert
- Mock external dependencies appropriately with Vitest mocks

### Vitest Configuration
- Configure Vitest for TypeScript support
- Use `vi.mock()` for mocking dependencies
- Implement test utilities for common setup patterns
- Run tests with `--run` flag for CI/CD pipelines

### Playwright Configuration
- Configure Playwright for multiple browsers (Chrome, Firefox, Safari)
- Use Page Object Model for maintainable E2E tests
- Implement proper test data setup and teardown
- Use Playwright's built-in assertions and waiting mechanisms

## Performance Guidelines
- Implement proper caching strategies with TanStack Query
- Use React.memo() and useMemo() judiciously
- Optimize database queries with proper indexing
- Implement pagination for large data sets
- Use lazy loading for non-critical components

## Security Practices
- Validate all inputs with Zod schemas
- Implement proper authentication and authorization
- Use environment variables for sensitive configuration
- Follow OWASP security guidelines
- Sanitize user inputs and outputs

## Error Handling
- Use consistent error response formats across APIs
- Implement proper error boundaries in React
- Log errors with appropriate context
- Provide meaningful error messages to users
- Handle async errors with proper try-catch blocks

## Documentation
- Document complex business logic and algorithms
- Use JSDoc for public APIs
- Maintain README files for each package
- Document deployment and setup procedures
- Keep API documentation up to date
