---
inclusion: always
---

# Tech Stack Guidelines

## Frontend Stack

### Next.js

- Use App Router for new features
- Implement Server Components by default, Client Components only when needed
- Follow Next.js 16+ conventions for routing and layouts
- Use TypeScript for all components and pages

### UI Components

- **shadcn/ui**: Primary component library
- Customize components in `components/ui/` directory
- Follow shadcn naming conventions and structure
- Use CSS variables for theming consistency

### Forms & Data Fetching

- **React Hook Form**: All form handling with Zod validation
- **TanStack Query**: Server state management and caching
- **Zod**: Schema validation for forms, API inputs, and data transformation
- Use query keys consistently across the application
- Implement optimistic updates where appropriate

## Backend Stack

### API Layer

- **Hono**: Lightweight web framework for Lambda functions
- **Zod**: Schema validation for request/response data and type safety
- Structure routes in feature-based modules
- Use middleware for authentication, validation, and error handling
- Follow RESTful conventions with proper HTTP status codes

### Database

- **PostgreSQL**: Primary relational database
- **DynamoDB**: NoSQL for high-performance use cases
- **OpenSearch**: Full-text search and analytics
- **Drizzle ORM**: Type-safe database operations

### Infrastructure

- **SST**: Infrastructure as Code
- **AWS Lambda**: Serverless compute
- Use environment-specific configurations
- Follow AWS best practices for security and performance

## AI Integration

- **AI SDK**: Standardized AI interactions
- Implement streaming responses where applicable
- Handle AI errors gracefully with fallbacks
