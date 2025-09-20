# Architecture Document

## Overview

This document describes the simplified architecture for the HowHappy MVP. The goal is to keep the system small enough to ship quickly while leaving a clear path to scale. We keep a single TypeScript/Express codebase, lean on PostgreSQL as the system of record, and use [pg-boss](https://github.com/timgit/pg-boss) for asynchronous work so we avoid managing additional queueing infrastructure. Deployment targets Render using the same Docker image for the API and background worker processes.

## Guiding Principles

- **One codebase, two processes.** The web API and job worker live in the same repository and Docker image, with Render running them as separate services. This keeps jobs off the main event loop without introducing cross-service coordination.
- **Postgres-first.** PostgreSQL stores application data and acts as the queue backend (via pg-boss), limiting moving parts.
- **Ship the essentials.** Features like multi-tenancy, complex RBAC, and custom infrastructure are deferred until user demand requires them.
- **Observable by default.** Structured logging and basic metrics from Render/Postgres give enough visibility for an MVP.
- **Auth boundary stays swappable.** The authentication module is isolated so we can replace the custom JWT flow with Better Auth, Lucia, or another provider without rewriting the application core.

## High-Level Architecture

```
┌──────────────┐      HTTPS       ┌──────────────────┐      SQL / pg-boss      ┌──────────────┐
│ React Client │ ───────────────▶ │ Express API      │ ───────────────────────▶│  PostgreSQL  │
└──────────────┘                  │ (Web process)    │                          │ (Render DB)  │
                                  │  - REST + JWT    │                          └──────────────┘
                                  │  - Enqueue jobs  │                                ▲
                                  └─────────▲────────┘                                │
                                            │                                         │
                         pg-boss jobs       │                                         │
                                            │                                         │
                                  ┌─────────┴────────┐        External APIs           │
                                  │ Job Worker       │ ───────────────────────────────┘
                                  │ (same image)     │    • MinIO (S3-compatible storage)
                                  │  - pg-boss       │    • ElevenLabs (transcription)
                                  │  - LLM analysis  │    • OpenAI/Claude (analysis)
                                  └──────────────────┘
```

### Component Responsibilities

- **React Client (web)**
  - Fetches surveys, submits audio recordings, shows analysis results.
  - Uses JWT for authenticated routes.

- **Express API (Render Web Service)**
  - Serves REST endpoints for auth, survey management, and response lifecycle.
  - Issues presigned MinIO URLs (S3-compatible) so clients upload audio directly to storage.
  - Schedules long-running work using pg-boss queues (transcription, analysis).
  - Exposes health and metrics endpoints for Render dashboards.

- **Background Worker (Render Background Service)**
  - Runs the same codebase with a different entry point (e.g., `npm run worker`).
  - Subscribes to pg-boss queues and executes transcription and analysis jobs.
  - Calls external APIs (ElevenLabs + LLM provider) and persists results back to Postgres.
  - Retries failures with pg-boss retry/backoff policies.

- **PostgreSQL (Render Managed Database)**
  - Stores all domain entities (users, surveys, responses, job state).
  - Powers pg-boss job tables; we configure reasonable retention to avoid bloat.

- **Object Storage (MinIO)**
  - Holds raw audio uploads and derived assets. Production uses the Render MinIO blueprint; local development reuses the Docker Compose MinIO service so endpoints stay consistent.

- **External AI Services**
  - **ElevenLabs** (or chosen transcription provider) for audio-to-text.
  - **OpenAI/Anthropic** for text analysis and insights.

## Request & Job Flow

1. Registered user authenticates (email/password) and receives a JWT.
2. User creates a survey via the API; survey metadata is stored in Postgres.
3. Respondent starts a survey response by posting to `/surveys/:id/responses`:
   - API creates the response record, returns the entity, and includes a presigned upload URL plus a temporary `responseToken` to authorize upload callbacks.
   - Client uploads audio directly to MinIO using the presigned URL and then patches the response with the final `audioUrl` (using the response token).
4. API updates the response and enqueues a `transcription.request` job in pg-boss.
5. Background worker consumes the job, fetches audio from MinIO, calls the transcription API, stores the transcription, and enqueues an `analysis.request` job.
6. Worker handles analysis, updates the response with summarised insights, and marks job status.
7. Client polls or queries the API for response status and results.

## Concurrency Model

Node’s event loop remains responsive because heavy work happens in the background worker process. Render runs the web service (Express) and worker service separately:

- **Web process**: V8 event loop handles HTTP requests, enqueues jobs via pg-boss.
- **Worker process**: Dedicated Node process (`worker.ts`) initializes pg-boss subscribers and performs long-running tasks. Jobs execute sequentially per queue; we can increase parallelism through pg-boss concurrency settings or by scaling worker instances on Render.

This separation avoids blocking the web server despite Node being single-threaded per process.

## Data Model (Prisma-style notation)

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   // bcrypt hashed password
  displayName  String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  surveys   Survey[]
  responses SurveyResponse[] // responses created while authenticated
}

model Survey {
  id          String   @id @default(uuid())
  ownerId     String
  title       String
  prompt      String   @db.Text
  status      SurveyStatus @default(DRAFT)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  owner     User   @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  responses SurveyResponse[]
}

model SurveyResponse {
  id                 String   @id @default(uuid())
  surveyId           String
  registeredUserId   String? // populated when signed-in user answers their own survey
  anonymousEmail     String? // optional contact for anonymous responders
  audioUrl           String?
  uploadState        UploadState @default(PREPARED)
  transcription      String? @db.Text
  transcriptionStatus JobStatus @default(PENDING)
  analysis           Json?
  analysisStatus     JobStatus @default(PENDING)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  survey   Survey @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  user     User?  @relation(fields: [registeredUserId], references: [id], onDelete: SetNull)
}

enum SurveyStatus {
  DRAFT
  ACTIVE
  CLOSED
}

enum JobStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum UploadState {
  PREPARED
  UPLOADING
  COMPLETED
  FAILED
}
```

pg-boss uses additional tables prefixed with `boss_` to track jobs; these are created automatically during initialization.

## Authentication & Authorization

- **Registered Users**
  - Create an account via `POST /auth/register` (email + password).
  - Passwords are hashed with bcrypt and stored in Postgres.
  - `POST /auth/login` issues a signed JWT (HS256) containing the user ID and expiry (e.g., 1 hour).
  - A refresh token table can be added later; for the MVP we can reauthenticate when the token expires.

- **Anonymous Responders**
  - No account required. When they begin a response, the API issues a `responseToken` (JWT with scope limited to the specific survey response ID, expiring after ~15 minutes).
  - That token authorizes `PATCH /surveys/:surveyId/responses/:responseId` to attach the uploaded audio but grants no access to owner-only endpoints.

- **Authorization**
  - Simple middleware validates the JWT, fetches the user, and scopes queries by `ownerId` as needed.
  - We currently support two roles: `registered` (JWT present) and `anonymous` (response token). Additional roles (e.g., admins) can be layered on later.
  - All auth logic (controllers, services, middleware) lives behind a thin interface so we can swap to Better Auth/Lucia/SuperTokens later with minimal surface changes.
  - Response tokens are short-lived JWTs scoped to a single response ID and limited to `PATCH /surveys/:surveyId/responses/:responseId` so anonymous participants can finish uploads without broader access.

## API Surface (selected endpoints)

```
POST   /auth/register            → { token }
POST   /auth/login               → { token }
GET    /me                       → User

GET    /surveys                  → { surveys, total }
POST   /surveys                  → Survey
GET    /surveys/:id              → Survey
PATCH  /surveys/:id              → Survey

POST   /surveys/:id/responses    → { response, uploadUrl?, responseToken? }
GET    /surveys/:id/responses    → { responses, total }
GET    /surveys/:id/responses/:responseId → SurveyResponse
PATCH  /surveys/:id/responses/:responseId → SurveyResponse

GET    /responses/:id            → SurveyResponse // convenience alias
GET    /health                      → { status }
```

Validation uses `zod` shared between routes and the client when practical.

## Job Queue Design

- **Queues**
  - `transcription.request`: created when a response is received.
  - `analysis.request`: created after transcription succeeds or directly when text responses are added later.

- **Retry Policies**
  - Built-in pg-boss retry with exponential backoff (e.g., 3 attempts, 30s/120s/300s).
  - Failures move to a dead-letter queue table; owners can trigger retries via the API.

- **Concurrency**
  - Each queue can process `n` jobs in parallel (configurable via pg-boss `subscribe` options). Start with 1–2 to stay within free-tier API rate limits, scale as needed by increasing concurrency or worker instances on Render.

## Deployment Strategy

### Docker Setup

```
Dockerfile         # multi-stage build (node:20-alpine)
Dockerfile.worker  # optional entrypoint override or use CMD args

docker-compose.yml
└── services:
    api:
      build: .
      command: npm run start
      ports:
        - "3000:3000"
      environment:
        - DATABASE_URL=postgres://...
        - PG_BOSS_SCHEMA=pgboss
    worker:
      build: .
      command: npm run worker
      depends_on:
        - postgres
      environment: same as api
    postgres:
      image: postgres:15
      ports:
        - "5432:5432"
      environment:
        POSTGRES_DB=howhappy
        POSTGRES_USER=postgres
        POSTGRES_PASSWORD=postgres
    minio:
      image: minio/minio
      command: server /data
      ports:
        - "9000:9000"
        - "9001:9001"
      environment:
        MINIO_ACCESS_KEY=dev
        MINIO_SECRET_KEY=devdevdev
```

- Local development runs `docker compose up api worker postgres minio`.
- Production builds the same Docker image; Render Web Service runs `npm run start`, and Render Background Worker runs `npm run worker` with identical environment.
- Render-managed Postgres provides TLS connection details used by both services.
- Render’s MinIO blueprint provides the production object storage; both services point their S3 client at the blueprint endpoint using the same credentials schema as local MinIO.

### Environment Configuration (.env.example)

```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/howhappy
PG_BOSS_SCHEMA=pgboss
JWT_SECRET=change-me
JWT_EXPIRES_IN=1h
BCRYPT_COST=12

# Object storage (MinIO)
MINIO_ENDPOINT=http://minio:9000
MINIO_BUCKET=howhappy-audio
MINIO_ACCESS_KEY=dev
MINIO_SECRET_KEY=devdevdev
MINIO_USE_SSL=false

# External services
ELEVENLABS_API_KEY=...
LLM_API_KEY=...
LLM_MODEL=gpt-4o-mini
```

Render production secrets map to the same variables (without exposing credentials in repo) with `MINIO_ENDPOINT` pointing at the Render MinIO service HTTPS URL and `MINIO_USE_SSL=true`.

## Core Tooling & Dependencies

- **Runtime**: Node.js 22 LTS (Hydrogen). Render supports it, and we get the latest performance improvements while staying in long-term support.
- **Package manager**: `pnpm` (workspace-friendly, faster installs). All scripts assume `pnpm <command>` and lockfile `pnpm-lock.yaml` is committed.
- **TypeScript**: v5.x with `tsconfig.json` tuned for strict mode. Development server runs via `tsx` (`pnpm dev`).
- **Web framework**: `express@5` with `express-async-errors` for async route handling.
- **ORM & migrations**: `prisma@6` targeting PostgreSQL.
- **Job queue**: `pg-boss@9` using the shared Postgres database.
- **Validation**: `zod` (request/response schemas, env parsing) and `zod-openapi` later if we publish docs.
- **Auth utilities**: `bcrypt` for password hashing, `jose` for JWT creation/verification.
- **Storage client**: AWS SDK v3 (`@aws-sdk/client-s3`) configured for MinIO compatibility.
- **Logging**: `pino` with `pino-http` for structured request logs.
- **HTTP clients**: `undici` (built-in to Node 18+, used via `fetch`) with lightweight wrappers in `infrastructure/external`.
- **Testing**: `vitest` for unit tests, `supertest` for API tests, `@testcontainers/postgresql` & `@testcontainers/minio` (or generic containers) for integration suites.
- **Linting & formatting**: `eslint` (typescript-eslint) and `prettier`, enforced via `pnpm lint` and `pnpm format`.

## Project Structure

```
src/
  app/
    http/
      controllers/           # Translate HTTP <-> domain requests/responses
      routes/                # Route registration per feature
      middleware/            # Auth, validation, error handling, request logging
      validators/            # zod schemas shared with clients
    jobs/
      transcription/         # pg-boss subscription + handler wiring
      analysis/
      index.ts               # Registers all workers with pg-boss
    bootstrap/
      express.ts             # Express app factory
      boss.ts                # pg-boss lifecycle helpers
  modules/
    auth/
      dto/
      schema.ts
      service.ts             # Business logic (password checks, token issuance)
      repository.ts          # Prisma queries for users + tokens
      index.ts               # Module exports (service factory)
    survey/
      dto/
      schema.ts
      service.ts
      repository.ts
      index.ts
    response/
      dto/
      schema.ts
      service.ts
      repository.ts
      index.ts
  infrastructure/
    database/
      prisma/
        schema.prisma        # single schema for MVP
        migrations/
      client.ts              # Prisma client singleton
    queue/
      boss.ts                # pg-boss instance + config
    storage/
      minio-client.ts        # MinIO/S3 client wrapped for dependency injection
    external/
      elevenlabs-client.ts
      llm-client.ts
  shared/
    config/
      env.ts                 # zod-based env parsing
      index.ts
    logging/
      logger.ts
    errors/
      app-error.ts
    utils/
  worker/
    index.ts                 # Worker entry point
    health.ts
  app.ts                     # Creates Express app via bootstrap layer
  server.ts                  # Web entry point (starts HTTP server)

tests/
  unit/
    modules/
  integration/
    api/
    worker/
  fixtures/

scripts/                    # One-off scripts (db seed, queue maintenance)
Dockerfile
docker-compose.yml
```

Each feature module (auth, survey, response) contains everything domain-specific—DTOs, validation, services, Prisma repositories—so controllers and workers depend on clearly defined interfaces. Shared infrastructure (database, queue, storage, external APIs) is isolated for easy swapping (e.g., migrating to Better Auth or a hosted transcription provider). Tests mirror the source layout, which keeps unit and integration coverage easy to navigate.

## Observability & Operations

- **Logging**: Use pino (JSON) with request IDs; logs stream to Render dashboards. Consider piping to Logtail later.
- **Metrics**: Leverage Render health checks, pg-boss job counts (`boss.workers.onComplete`) and Postgres monitoring.
- **Alerts**: Start with manual checks; add automated alerts when usage grows (Render cron job calling `/metrics` or external service).

## Testing Strategy

- **Unit tests** run with Vitest against pure business logic (validation schemas, auth helpers, queue handlers). External integrations (MinIO, ElevenLabs, LLM API) are mocked using libraries like `nock` or `msw` so the tests stay fast and deterministic.
- **API integration tests** exercise the Express routes end-to-end with Supertest while Testcontainers (or docker-compose in CI) spins up disposable Postgres + MinIO instances. Each run applies Prisma migrations to the temporary database and tears everything down afterward.
- **Worker tests** boot pg-boss against the same Postgres test instance, enqueue jobs programmatically, and assert on resulting database state/log output. ElevenLabs/LLM clients are stubbed at the HTTP layer to avoid real network calls.

## Future Enhancements

Place to stash future enhancements, ideas, etc.

- Add refresh tokens + remember-me.
- Layer in tenant-aware permissions once we onboard multi-tenant customers.
