---
inclusion: always
---

# Design Patterns Guidelines

## Core Patterns

### Service Pattern

- Encapsulate business logic and orchestrate operations
- Implement in `packages/core/src/services/` directory
- Services coordinate between repositories and adapters
- Keep services focused on single business domains
- Examples: `UserService`, `PaymentService`, `NotificationService`

### Repository Pattern

- Abstract data access layer and provide clean interface for data operations
- Implement in `packages/core/src/repositories/` directory
- Define interfaces for data operations, implement with specific data sources
- Handle data mapping and transformation
- Examples: `UserRepository`, `OrderRepository`, `ProductRepository`

### Adapter Pattern

- Integrate third-party services and APIs with standardized interfaces
- Implement in `packages/core/src/adapters/` directory
- Standardize external service interfaces for internal consumption
- Handle external API specifics and data transformation
- Examples: `PaymentAdapter`, `EmailAdapter`, `SearchAdapter`

### Factory Method & Abstract Factory

- Use Factory patterns for creating complex objects with multiple variants
- Abstract Factory for families of related objects (e.g., different database providers)
- Implement in `packages/core/src/factories/` directory
- Example: `UserFactory`, `NotificationFactory`, `DatabaseProviderFactory`

### Strategy Pattern

- Implement Strategy for algorithms that can vary at runtime
- Use for business rules, validation strategies, and processing logic
- Store strategies in `packages/core/src/strategies/` directory
- Examples: `PricingStrategy`, `ValidationStrategy`, `ProcessingStrategy`

## Implementation Guidelines

### Service Pattern Structure

```typescript
// Service interface
interface UserService {
  createUser(userData: CreateUserData): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  updateUser(id: string, updates: UpdateUserData): Promise<User>;
}

// Service implementation
class UserServiceImpl implements UserService {
  constructor(
    private userRepository: UserRepository,
    private emailAdapter: EmailAdapter
  ) {}

  async createUser(userData: CreateUserData): Promise<User> {
    const user = await this.userRepository.create(userData);
    await this.emailAdapter.sendWelcomeEmail(user.email);
    return user;
  }
}
```

### Repository Pattern Structure

```typescript
// Repository interface
interface UserRepository {
  create(userData: CreateUserData): Promise<User>;
  findById(id: string): Promise<User | null>;
  update(id: string, updates: UpdateUserData): Promise<User>;
  delete(id: string): Promise<void>;
}

// Repository implementation
class PostgresUserRepository implements UserRepository {
  constructor(private db: Database) {}

  async create(userData: CreateUserData): Promise<User> {
    // Database-specific implementation
  }
}
```

### Adapter Pattern Structure

```typescript
// Target interface
interface PaymentProcessor {
  processPayment(amount: number): Promise<PaymentResult>;
}

// Adapter
class StripeAdapter implements PaymentProcessor {
  constructor(private stripe: Stripe) {}

  async processPayment(amount: number): Promise<PaymentResult> {
    // Adapt Stripe API to our interface
  }
}
```

### Factory Pattern Structure

```typescript
// Abstract Factory
interface ServiceFactory {
  createEmailService(): EmailService;
  createPaymentService(): PaymentService;
}

// Concrete Factory
class ProductionServiceFactory implements ServiceFactory {
  createEmailService(): EmailService {
    return new SendGridEmailService();
  }
}
```

### API Handler Structure

````typescript
// ✅ CORRECT: Handler only uses services
import { UserService } from '@packages/core/services';

export const createUserHandler = async (c: Context) => {
  const userService = new UserService(); // Or inject via DI
  const userData = await c.req.json();

  try {
    const user = await userService.createUser(userData);
    return c.json(user, 201);
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
};

// ❌ INCORRECT: Handler directly accessing repository
import { UserRepository } from '@packages/core/repositories'; // DON'T DO THIS
```I Handler Structure
```typescript
// ✅ CORRECT: Handler only uses services
import { UserService } from '@packages/core/services';

export const createUserHandler = async (c: Context) => {
  const userService = new UserService(); // Or inject via DI
  const userData = await c.req.json();

  try {
    const user = await userService.createUser(userData);
    return c.json(user, 201);
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
};

// ❌ INCORRECT: Handler directly accessing repository
import { UserRepository } from '@packages/core/repositories'; // DON'T DO THIS
````

### Strategy Pattern Structure

```typescript
// Strategy interface
interface ValidationStrategy {
  validate(data: unknown): ValidationResult;
}

// Context
class Validator {
  constructor(private strategy: ValidationStrategy) {}

  validate(data: unknown): ValidationResult {
    return this.strategy.validate(data);
  }
}
```

## Pattern Usage Guidelines

- Use Service patterns to orchestrate business logic and coordinate between layers
- Use Repository patterns to abstract data access and provide clean interfaces
- Use Adapter patterns for external service integration
- Use Factory patterns for object creation complexity
- Use Strategy patterns for runtime algorithm selection
- Keep patterns simple and focused on single responsibilities
- Document pattern usage in code comments

## Layer Interaction Flow

```
API Handlers (apps/functions) → Services Only
Services → Repositories → Data Sources
Services → Adapters → External APIs
Services → Strategies → Algorithm Selection
Factories → Create Services/Repositories/Adapters
```

## Architectural Boundaries

- **API Handlers** (`apps/functions/`) MUST only consume services from `packages/core/src/services/`
- Handlers should NOT directly access repositories, adapters, or strategies
- All business logic coordination happens within services
- This ensures clean separation and testability

## Directory Structure

```
packages/core/src/
├── adapters/           # External service integrations
├── repositories/       # Data access layer
├── services/          # Business logic orchestration
├── strategies/        # Algorithm implementations
└── factories/         # Object creation patterns
```
