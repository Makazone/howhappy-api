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

## Phase 2 – Survey CRUD MVP

- [ ] **Domain & repositories**
  - [ ] Implement `modules/survey/repository.ts` with Prisma queries (list, get, create, update).
  - [ ] Implement `modules/survey/service.ts` encapsulating business rules (status transitions, input validation hooks).
  - [ ] Implement `modules/survey/schema.ts` and DTOs for create/update/list operations.

- [ ] **Auth groundwork**
  - [ ] Implement `modules/auth/service.ts` with register/login/token issuance backed by Prisma `User` repository.
  - [ ] Implement `app/http/middleware/authentication.ts` verifying JWT + injecting user into request context.
  - [ ] Add `/auth/register`, `/auth/login`, `/me` endpoints using controllers and DTOs.

- [ ] **Survey HTTP API**
  - [ ] Add controllers (`app/http/controllers/survey.controller.ts`) with REST endpoints for `GET /surveys`, `POST /surveys`, `GET /surveys/:id`, `PATCH /surveys/:id`.
  - [ ] Add routes under `app/http/routes/v1/survey.routes.ts` and register in router index.
  - [ ] Implement validation middleware using zod schemas for requests/responses.
  - [ ] Ensure controllers call survey service only; no direct Prisma usage.

- [ ] **Response scaffolding (minimal)**
  - [ ] Add `modules/response` placeholders with repository/service supporting response creation + upload state updates (even if job handlers stubbed).
  - [ ] Expose `POST /surveys/:id/responses` and `PATCH /surveys/:id/responses/:responseId` with stubbed handler returning mocked uploadUrl/responseToken.

- [ ] **Queue integration (stub)**
  - [ ] Register `transcription.request` and `analysis.request` queues with no-op handlers returning success (ready for future implementation).

- [ ] **Testing**
  - [ ] Add unit tests for survey service covering create/update validation.
  - [ ] Add API integration tests for survey CRUD endpoints (including auth guard behavior).
  - [ ] Add worker test ensuring response creation enqueues transcription job.

- [ ] **Documentation & developer experience**
  - [ ] Update `README.md` with setup instructions (`pnpm install`, `pnpm dev`, Docker compose).
  - [ ] Update `TODO.md` with completed tasks along the way.
  - [ ] Update `AGENTS.md` with relevant findings and ideas.
  - [ ] Provide `.env.example` matching architecture doc (Postgres, MinIO, auth secrets).
  - [ ] Document testing workflow (unit vs integration) and how to run worker locally.

## Optional Stretch (Post-MVP)

- [ ] Replace stubbed MinIO/AI clients with real implementations tied to Render secrets.
- [ ] Implement transcription + analysis job processors with external API calls and pg-boss retries.
- [ ] Add OpenAPI spec generation for survey endpoints.
