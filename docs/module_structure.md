# Module Structure Blueprint

This document defines the standard module structure for the HowHappy application, based on the migrated `@auth` module. All feature modules should follow this pattern for consistency and maintainability.

## Overview

Each module is self-contained within `src/modules/<module-name>/` and includes all code related to that feature: controllers, services, validators, repositories, and module-specific middleware.

## Directory Structure

```
src/modules/<module-name>/
├── controllers/
│   └── <module-name>.controller.ts
├── services/
│   └── <module-name>.service.ts
├── validators/
│   └── <module-name>.validators.ts
├── repositories/
│   └── <entity-name>.repository.ts
├── workers/                             (optional, only if module has background jobs)
│   ├── <job-name>.worker.ts
│   └── index.ts
└── middleware/                          (optional, only if module has specific middleware)
    └── <middleware-name>.ts
```

## Layer Responsibilities

### 1. Controllers (`controllers/`)

**Purpose**: Handle HTTP requests and responses. Transform service results into HTTP responses.

**Responsibilities**:

- Parse and validate HTTP requests
- Call service layer methods
- Transform service results into HTTP responses
- Handle HTTP status codes
- Keep business logic minimal

**Example**: `src/modules/auth/controllers/auth.controller.ts`

```typescript
import type { RequestHandler, Request, Response } from 'express';
import { asyncHandler } from '@app/http/middleware/async-handler.js';
import { authService } from '@modules/auth/services/auth.service.js';
import {
  authTokenResponseSchema,
  type AuthTokenResponse,
} from '@modules/auth/validators/auth.validators.js';

export const register: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.register(req.body);
  const payload = buildAuthTokenResponse(tokens.token, user);
  res.status(201).json(payload);
});
```

**Guidelines**:

- Export individual handler functions (not a class)
- Use `asyncHandler` wrapper for async functions
- Keep transformations simple and focused
- Use validator schemas for response validation when needed
- Import services from the same module using `@modules/<module>/services/...`

### 2. Services (`services/`)

**Purpose**: Implement business logic and coordinate between repositories.

**Responsibilities**:

- Implement core business logic
- Coordinate multiple repositories
- Handle transactions
- Validate business rules
- Throw appropriate domain errors

**Example**: `src/modules/auth/services/auth.service.ts`

```typescript
import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { userRepository, UserRepository } from '../repositories/user.repository.js';
import { loginInputSchema, type LoginInput } from '../validators/auth.validators.js';
import { ConflictError, UnauthorizedError } from '@shared/errors/app-error.js';

export class AuthService {
  private users: UserRepository;

  constructor({ users = userRepository }: AuthServiceDeps = {}) {
    this.users = users;
  }

  async login(input: LoginInput): Promise<{ user: User; tokens: AuthTokens }> {
    const payload = loginInputSchema.parse(input);
    const user = await this.users.findByEmail(payload.email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }
    // ... business logic
  }
}

export const authService = new AuthService();
```

**Guidelines**:

- Use classes with dependency injection for testability
- Export a singleton instance for production use
- Validate inputs using validator schemas
- Use relative imports for same-module dependencies (`../validators/...`)
- Throw `AppError` subclasses (never plain Error)
- Keep services focused on a single domain

### 3. Validators (`validators/`)

**Purpose**: Define Zod schemas for validation and type inference.

**Responsibilities**:

- Define input validation schemas
- Define response validation schemas
- Export TypeScript types via `z.infer`
- Group related schemas logically

**Example**: `src/modules/auth/validators/auth.validators.ts`

```typescript
import { z } from 'zod';

export const registerInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(120).optional(),
});

export const userPublicSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const authTokenResponseSchema = z.object({
  token: z.string(),
  user: userPublicSchema,
});

export type RegisterInput = z.infer<typeof registerInputSchema>;
export type UserPublic = z.infer<typeof userPublicSchema>;
export type AuthTokenResponse = z.infer<typeof authTokenResponseSchema>;
```

**Guidelines**:

- Name input schemas: `<action>InputSchema` or `<action>Schema`
- Name response schemas: `<action>ResponseSchema` or `<entity>Schema`
- Export both schemas and their inferred types
- Compose schemas when possible (e.g., `user: userPublicSchema`)
- Keep one validators file per module (can group by subdomain if needed)

### 4. Repositories (`repositories/`)

**Purpose**: Abstract database access and queries.

**Responsibilities**:

- Interact with Prisma client
- Execute database queries
- Return Prisma types (User, Survey, etc.)
- Handle data access patterns

**Example**: `src/modules/auth/repositories/user.repository.ts`

```typescript
import { prisma } from '@infrastructure/database/client.js';
import type { User } from '@prisma/client';

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    displayName?: string | null;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email.trim().toLowerCase(),
        passwordHash: data.passwordHash,
        displayName: data.displayName,
      },
    });
  }
}

export const userRepository = new UserRepository();
```

**Guidelines**:

- Use classes for consistency and testability
- Export a singleton instance for production use
- Return Prisma types directly (no custom mapping)
- Keep queries focused and specific
- Name repositories after entities: `<Entity>Repository`

### 5. Workers (`workers/`)

**Purpose**: Module-specific background job handlers (optional).

**Responsibilities**:

- Define pg-boss job handlers for the module's domain
- Process asynchronous work (transcription, analysis, notifications)
- Call module services for business logic
- Handle job-specific error logging and retries

**Example**: `src/modules/response/workers/transcription.worker.ts`

```typescript
import type PgBoss from 'pg-boss';
import { logger } from '@shared/logging/logger.js';
import type { WorkerConfig } from '@worker/shared/types.js';
import { logJobStart, logJobComplete } from '@worker/shared/utils.js';
import { TranscriptionService } from '../services/transcription.service.js';

export interface TranscriptionRequestPayload {
  responseId: string;
  surveyId: string;
}

const workerLogger = logger.child({ worker: 'transcription' });

async function handleTranscriptionRequest(
  jobs: PgBoss.Job<TranscriptionRequestPayload>[],
): Promise<void> {
  const [job] = jobs;

  logJobStart(job, { responseId: job.data.responseId });

  const transcriptionService = new TranscriptionService();

  try {
    await transcriptionService.processTranscription(job.data.responseId);
    logJobComplete(job, { responseId: job.data.responseId });
  } catch (error) {
    workerLogger.error({ jobId: job.id, error }, 'Transcription failed');
    throw error; // let pg-boss handle retry logic
  }
}

export const transcriptionWorker: WorkerConfig<TranscriptionRequestPayload> = {
  queueName: 'transcription.request',
  handler: handleTranscriptionRequest,
  options: {
    teamSize: 2,
    teamConcurrency: 1,
  },
};
```

**Worker Index**: `src/modules/response/workers/index.ts`

```typescript
export { transcriptionWorker } from './transcription.worker.js';
export { analysisWorker } from './analysis.worker.js';
export type { TranscriptionRequestPayload } from './transcription.worker.js';
export type { AnalysisRequestPayload } from './analysis.worker.js';
```

**Guidelines**:

- Export `WorkerConfig` objects (not classes) with `queueName`, `handler`, and `options`
- Workers call services, never repositories or Prisma directly
- Keep workers thin—business logic belongs in services
- Use shared worker utilities from `@worker/shared/utils.js` for consistent logging
- Define job payload types in the worker file and export them
- Create an `index.ts` to re-export all workers for the module
- Register workers in `src/worker/index.ts` by importing from module's `workers/index.ts`

**Worker Registration**: `src/worker/index.ts`

```typescript
import { transcriptionWorker, analysisWorker } from '@modules/response/workers/index.js';
import type { WorkerConfig } from './shared/types.js';

const WORKERS: WorkerConfig[] = [transcriptionWorker, analysisWorker];

// In startup:
for (const worker of WORKERS) {
  await boss.work(worker.queueName, worker.options || {}, worker.handler);
}
```

### 6. Middleware (`middleware/`)

**Purpose**: Module-specific Express middleware (optional).

**Responsibilities**:

- Handle module-specific request processing
- Augment request objects
- Perform authentication/authorization specific to this module
- Reusable logic that runs before controllers

**Example**: `src/modules/auth/middleware/authentication.ts`

```typescript
import type { RequestHandler } from 'express';
import { UnauthorizedError } from '@shared/errors/app-error.js';
import { verifyToken, isUserToken } from '@shared/security/jwt.js';

export interface AuthenticatedUser {
  id: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function requireUser(): RequestHandler {
  return (req, _res, next) => {
    try {
      const token = extractBearerToken(req.headers.authorization);
      const payload = verifyToken(token);
      if (!isUserToken(payload)) {
        throw new UnauthorizedError('Invalid token type');
      }
      req.user = { id: payload.sub };
      next();
    } catch (error) {
      next(error);
    }
  };
}
```

**Guidelines**:

- Only create middleware folder if the module needs it
- Export factory functions that return RequestHandler
- Use TypeScript declaration merging to augment Express types
- Keep middleware focused on cross-cutting concerns within the module

## File Naming Conventions

| Layer      | File Name Pattern             | Example                   |
| ---------- | ----------------------------- | ------------------------- |
| Controller | `<module-name>.controller.ts` | `auth.controller.ts`      |
| Service    | `<module-name>.service.ts`    | `auth.service.ts`         |
| Validators | `<module-name>.validators.ts` | `auth.validators.ts`      |
| Repository | `<entity-name>.repository.ts` | `user.repository.ts`      |
| Worker     | `<job-name>.worker.ts`        | `transcription.worker.ts` |
| Middleware | `<descriptive-name>.ts`       | `authentication.ts`       |

## Import Patterns

### Within the Same Module

Use **relative imports** for files in the same module:

```typescript
// In auth.service.ts
import { userRepository } from '../repositories/user.repository.js';
import { loginInputSchema } from '../validators/auth.validators.js';
```

### Across Modules

Use **path aliases** when importing from other modules:

```typescript
// In auth.controller.ts
import { asyncHandler } from '@app/http/middleware/async-handler.js';
import { authService } from '@modules/auth/services/auth.service.js';
import { loginInputSchema } from '@modules/auth/validators/auth.validators.js';
```

### Path Aliases Reference

```typescript
@shared/*         // Shared utilities (errors, logging, config, security)
@modules/*        // Feature modules (auth, survey, response)
@infrastructure/* // Infrastructure (database, queue, storage, external)
@app/*           // HTTP layer (routes, middleware, bootstrap)
@worker/*         // Worker infrastructure (shared types, utilities)
@docs/*          // Documentation generation (OpenAPI)
```

## Routes Integration

Routes remain **centralized** in `src/app/http/routes/v1/` but import from modules:

```typescript
// src/app/http/routes/v1/auth.routes.ts
import { Router } from 'express';
import { register, login, me } from '@modules/auth/controllers/auth.controller.js';
import { validateBody } from '../../middleware/validation.js';
import { requireUser } from '@modules/auth/middleware/authentication.js';
import { registerInputSchema, loginInputSchema } from '@modules/auth/validators/auth.validators.js';

const router: Router = Router();

router.post('/auth/register', validateBody(registerInputSchema), register);
router.post('/auth/login', validateBody(loginInputSchema), login);
router.get('/auth/me', requireUser(), me);

export default router;
```

## Migration Checklist

When migrating an existing module to this structure:

- [ ] Create new directory structure (`controllers/`, `services/`, `validators/`, `repositories/`, `workers/`, `middleware/`)
- [ ] Move validators: `schema.ts` → `validators/<module>.validators.ts`
- [ ] Move controller: `src/app/http/controllers/<module>.controller.ts` → `src/modules/<module>/controllers/<module>.controller.ts`
- [ ] Move middleware (if module-specific): `src/app/http/middleware/<name>.ts` → `src/modules/<module>/middleware/<name>.ts`
- [ ] Move workers (if module has background jobs): Extract from `src/worker/index.ts` → `src/modules/<module>/workers/<job>.worker.ts`
- [ ] Create worker services: Extract business logic from workers → `src/modules/<module>/services/<job>.service.ts`
- [ ] Update imports in service layer (validators path change)
- [ ] Update imports in controller (asyncHandler, validators)
- [ ] Update imports in routes (controller, validators, middleware)
- [ ] Update imports in worker entry point (`src/worker/index.ts`)
- [ ] Update imports in OpenAPI docs (`src/docs/openapi.ts`)
- [ ] Update imports in any tests
- [ ] Delete old files from original locations
- [ ] Run typecheck: `pnpm run typecheck`
- [ ] Run tests: `pnpm test`
- [ ] Regenerate OpenAPI: `pnpm run docs:openapi`

## Benefits of This Structure

1. **Co-location**: All code for a feature lives together
2. **Clear Boundaries**: Each layer has a single responsibility
3. **Testability**: Dependency injection makes testing easier
4. **Discoverability**: Easy to find where functionality lives
5. **Scalability**: New modules can be added without affecting others
6. **Consistency**: All modules follow the same pattern

## Example: Response Module

The response module serves as a comprehensive reference implementation:

```
src/modules/response/
├── controllers/
│   └── response.controller.ts       # HTTP handlers: prepare, complete, list
├── services/
│   ├── response.service.ts          # Business logic: prepare response, complete upload
│   ├── transcription.service.ts     # Business logic: audio transcription processing
│   └── analysis.service.ts          # Business logic: transcription analysis
├── validators/
│   └── response.validators.ts       # Zod schemas: prepareResponseSchema, completeResponseSchema
├── repositories/
│   └── response.repository.ts       # Database access: create, update, findById
└── workers/
    ├── transcription.worker.ts      # Background job: process audio transcription
    ├── analysis.worker.ts           # Background job: analyze transcription
    └── index.ts                     # Re-export all workers

```

Routes that use this module:

- `src/app/http/routes/v1/response.routes.ts`

Workers registered from this module:

- `transcription.request` → `transcriptionWorker`
- `analysis.request` → `analysisWorker`

## Questions?

- **Where do DTOs go?** Use validators with Zod schemas instead
- **Where do utilities go?** Module-specific utils can go in a `utils/` folder within the module; shared utils go in `@shared`
- **Where do types go?** Export types from validators using `z.infer`
- **Where do constants go?** Module-specific constants can live at the top of relevant files or in a `constants.ts` file
- **What about shared middleware?** Keep in `src/app/http/middleware/` (e.g., `validation.ts`, `async-handler.ts`, `error-handler.ts`)
- **What about shared worker infrastructure?** Keep in `src/worker/shared/` (e.g., `types.ts`, `utils.ts`)
- **Where does business logic for workers go?** In services within the module (`services/<job>.service.ts`), not in the worker handlers
- **How are workers registered?** Manually imported and registered in `src/worker/index.ts` from each module's `workers/index.ts`

---

**Last Updated**: November 13, 2024  
**Reference Implementations**:

- HTTP Layer: `src/modules/auth/`
- Workers & Background Jobs: `src/modules/response/`
