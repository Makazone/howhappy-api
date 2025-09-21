# TODO

## Phase 1 – Project Bootstrap ✅

- [x] **Initialize repo tooling**
  - [x] Set Node runtime to 22.x (Render & local `.nvmrc` / `.node-version`).
  - [x] Configure `pnpm` workspace and install baseline dependencies (express, prisma, pg-boss, zod, pino, vitest, supertest, testcontainers, eslint, prettier, tsx).
  - [x] Create base `tsconfig.json`, `.eslintrc.cjs`, `.prettierrc`, and `pnpm` scripts (`dev`, `build`, `lint`, `format`, `test`, `worker`).

- [x] **Prisma & database setup**
  - [x] Add `prisma/schema.prisma` with `User`, `Survey`, `SurveyResponse` models and enums (`SurveyStatus`, `JobStatus`, `UploadState`).
  - [x] Generate initial Prisma migration and `pnpm prisma migrate dev` script.
  - [x] Add Prisma client bootstrap (`infrastructure/database/client.ts`).

- [x] **Express + worker scaffolding**
  - [x] Implement `src/app/bootstrap/express.ts` returning configured Express app (JSON parser, logging middleware, health route).
  - [x] Implement `src/app/bootstrap/boss.ts` that creates a pg-boss instance.
  - [x] Create entrypoints `src/app.ts` (builds app) and `src/server.ts` (starts HTTP server).
  - [x] Create worker entrypoint `src/worker/index.ts` wired to pg-boss (stub jobs).

- [x] **Core infrastructure adapters**
  - [x] Stub MinIO client wrapper (`infrastructure/storage/minio-client.ts`) using AWS SDK v3 with config from env.
  - [x] Add ElevenLabs and LLM client placeholders returning mocked data for now.
  - [x] Add shared config loader (`shared/config/env.ts`) using `zod`.
  - [x] Add structured logger (`shared/logging/logger.ts`) using `pino`.

- [x] **Testing & CI smoke**
  - [x] Set up Vitest config for unit tests and add one sample unit test (e.g., environment validation).
  - [x] Add integration test harness using Supertest + Testcontainers (Postgres + MinIO) exercising health endpoint and DB connectivity.
  - [x] Add worker integration smoke test enqueueing a dummy job and ensuring handler is invoked (temporary stub handler).
  - [x] Wire `pnpm test` to run both unit and integration suites locally.

## Phase 2 – Survey CRUD MVP ✅

- [x] **Domain & repositories**
  - [x] Implement `modules/survey/repository.ts` with Prisma queries (list, get, create, update).
  - [x] Implement `modules/survey/service.ts` encapsulating business rules (status transitions, input validation hooks).
  - [x] Implement `modules/survey/schema.ts` and DTOs for create/update/list operations.

- [x] **Auth groundwork**
  - [x] Implement `modules/auth/service.ts` with register/login/token issuance backed by Prisma `User` repository.
  - [x] Implement `app/http/middleware/authentication.ts` verifying JWT + injecting user into request context.
  - [x] Add `/auth/register`, `/auth/login`, `/me` endpoints using controllers and DTOs.

- [x] **Survey HTTP API**
  - [x] Add controllers (`app/http/controllers/survey.controller.ts`) with REST endpoints for `GET /surveys`, `POST /surveys`, `GET /surveys/:id`, `PATCH /surveys/:id`.
  - [x] Add routes under `app/http/routes/v1/survey.routes.ts` and register in router index.
  - [x] Implement validation middleware using zod schemas for requests/responses.
  - [x] Ensure controllers call survey service only; no direct Prisma usage.

- [x] **Response scaffolding (minimal)**
  - [x] Add `modules/response` placeholders with repository/service supporting response creation + upload state updates (even if job handlers stubbed).
  - [x] Expose `POST /surveys/:id/responses` and `PATCH /surveys/:id/responses/:responseId` with stubbed handler returning mocked uploadUrl/responseToken.

- [x] **Queue integration (stub)**
  - [x] Register `transcription.request` and `analysis.request` queues with no-op handlers returning success (ready for future implementation).
  - [x] Ensure API enqueues transcription job when a response is completed.

- [x] **Testing**
  - [x] Add unit tests for survey service covering create/update validation.
  - [x] Add API integration tests for survey CRUD endpoints (including auth guard behavior).
  - [x] Add worker test ensuring response creation enqueues transcription job.

- [x] **Documentation & developer experience**
  - [x] Update `README.md` with setup instructions (`pnpm install`, `pnpm dev`, Docker compose note) and new API surface.
  - [x] Update `TODO.md` with completed tasks along the way.
  - [x] Update `AGENTS.md` with relevant findings and ideas.
  - [x] Provide `.env.example` matching architecture doc (Postgres, MinIO, auth secrets).
  - [x] Document testing workflow (unit vs integration) and how to run worker locally.

## Phase 3 – Improving API response schema ✅

- [x] Move OpenAPI response schemas into module-owned DTOs:
  - [x] Auth responses (`POST /v1/auth/register`, `POST /v1/auth/login`, `GET /v1/auth/me`).
  - [x] Survey endpoints (`GET|POST|GET:id|PATCH /v1/surveys`).
  - [x] Response endpoints (`POST /v1/surveys/:id/responses`, `PATCH /v1/surveys/:surveyId/responses/:responseId`).

## Future Phases

- [ ] Add OpenAPI spec generation for survey endpoints.
- [ ] Replace stubbed MinIO/AI clients with real implementations tied to Render secrets.
- [ ] Implement transcription + analysis job processors with external API calls and pg-boss retries.
