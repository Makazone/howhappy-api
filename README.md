# HowHappy

Survey collection system with audio transcription and analysis.

## Prerequisites

- Node.js 22.x (see `.nvmrc` / `.node-version`)
- pnpm 9+
- Docker (for running Postgres, MinIO, and integration tests)

## Setup

1. Install dependencies

   ```bash
   pnpm install
   ```

2. Configure environment variables

   ```bash
   cp .env.example .env
   # Edit .env with your secrets (Postgres, JWT, MinIO)
   ```

3. Generate Prisma client and apply migrations

   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate:dev
   ```

## Development

Start the API server with hot reload:

```bash
pnpm dev
```

Start the background worker (pg-boss subscribers):

```bash
pnpm worker
```

Both processes expect Postgres and MinIO to be running. A Docker Compose file will follow in a future update; for now use local services or Testcontainers during tests.

### API Documentation

- Interactive Swagger UI is available once the server is running at `http://localhost:3000/docs`.
- The raw OpenAPI document is served from `http://localhost:3000/openapi.json`.
- To generate an updated static spec (written to `docs/openapi.json`) without starting the server, run:

  ```bash
  pnpm docs:openapi
  ```

> ℹ️ A Git pre-commit hook (configured via `simple-git-hooks`) automatically runs `pnpm run typecheck`, `pnpm run format`, `pnpm run lint`, and `pnpm run docs:openapi`. Run `pnpm install` after cloning to enable the hook locally.

## Testing

Run all tests (unit + integration):

```bash
pnpm test
```

Unit tests only:

```bash
pnpm test:unit
```

Integration tests (requires Docker):

```bash
pnpm test:integration
```

The integration suite spins up disposable Postgres and MinIO containers via Testcontainers, applies the bootstrap migration, starts a pg-boss producer, and exercises key HTTP flows (auth, survey CRUD, response preparation/completion).

## API Overview

All application routes are namespaced under `/v1`.

### Auth

| Method | Path                | Description                     |
| ------ | ------------------- | ------------------------------- |
| POST   | `/v1/auth/register` | Create an account (returns JWT) |
| POST   | `/v1/auth/login`    | Authenticate (returns JWT)      |
| GET    | `/v1/auth/me`       | Current user profile            |

### Surveys

Authenticated requests must include `Authorization: Bearer <user-token>`.

| Method | Path              | Description                |
| ------ | ----------------- | -------------------------- |
| GET    | `/v1/surveys`     | List surveys for owner     |
| POST   | `/v1/surveys`     | Create survey (DRAFT)      |
| GET    | `/v1/surveys/:id` | Get specific survey        |
| PATCH  | `/v1/surveys/:id` | Update title/prompt/status |

### Responses

| Method | Path                                          | Description                                                       |
| ------ | --------------------------------------------- | ----------------------------------------------------------------- |
| POST   | `/v1/surveys/:id/responses`                   | Prepare a response; returns presigned upload URL + response token |
| PATCH  | `/v1/surveys/:surveyId/responses/:responseId` | Complete upload (requires response token in `Authorization`)      |

Completing a response enqueues a `transcription.request` job on pg-boss.

## Project Structure

```
src/
├── app/
│   ├── bootstrap/        # Express/pg-boss factories
│   ├── http/             # Controllers, middleware, routes
│   └── worker/           # Background job entrypoint
├── infrastructure/       # Adapters (database, queue, storage, external APIs)
├── modules/              # Domain modules (auth, survey, response)
├── shared/               # Cross-cutting concerns (config, logging, security, errors)
├── app.ts                # Express app builder
└── server.ts             # HTTP server bootstrap (DB + queue init)
```

Additional docs:

- `ARCHITECTURE.md` – system design, request flow, deployment.
- `CODING_PRINCIPLES.md` – layered architecture, testing expectations.
- `TODO.md` – roadmap and stretch goals.

## Scripts

- `pnpm dev` – start API server in watch mode
- `pnpm worker` – start worker process in watch mode
- `pnpm build` – type-check and emit compiled JS
- `pnpm typecheck` – run TypeScript in noEmit mode
- `pnpm lint` / `pnpm format` – static analysis & formatting
- `pnpm test`, `pnpm test:unit`, `pnpm test:integration`
- `pnpm prisma:generate`, `pnpm prisma:migrate:dev`, `pnpm prisma:migrate:deploy`, `pnpm prisma:studio`

## Deployment Notes

- `server.ts` initialises both the database connection and a pg-boss producer (for publishing transcription jobs).
- `worker/index.ts` subscribes to `transcription.request` and `analysis.request` queues with stub handlers; replace stubs when wiring external integrations.
- MinIO configuration accepts full endpoints (e.g. `http://minio:9000`) and adapts automatically for HTTPS in production.

## Troubleshooting

- Ensure Docker has at least 4GB RAM available for integration tests.
- If `pg-boss` fails to start, verify `DATABASE_URL` points to a reachable Postgres instance.
- After changing the Prisma schema, regenerate the client and re-run migrations.
