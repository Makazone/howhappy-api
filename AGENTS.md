# Agent Guide

Use this document to get up to speed before working in this repository.

## Key References

- **Architecture**: See `ARCHITECTURE.md` for the system overview, request/job flow, deployment, project structure, and core tooling (Express, Prisma, pg-boss, MinIO, Render).
- **Coding Principles**: Follow the layered architecture, module boundaries, testing strategy, and error-handling rules in `CODING_PRINCIPLES.md`.
- **Roadmap**: `TODO.md` now tracks stretch tasks only; Phase 1 (bootstrap) and Phase 2 (survey CRUD + auth) are complete.

## Current State

- MVP endpoints (`/v1/auth/*`, `/v1/surveys`, `/v1/surveys/:id/responses`) are implemented with validation, JWT auth, and pg-boss publishing for transcription jobs.
- Prisma schema matches the architecture doc (User/Survey/SurveyResponse with upload + analysis statuses) and migrations live in `prisma/migrations/20250920095931_bootstrap`.
- Queue producer starts with the web server (`initQueueProducer` in `server.ts`); worker subscribes to `transcription.request` and `analysis.request` stubs.
- Integration tests spin up Postgres + MinIO containers, apply the bootstrap migration, and verify auth/survey/response flows plus pg-boss job emission.

## Expectations for Agents

1. **Stay Within Architecture**
   - Keep controllers thin, call module services only, and use repositories for Prisma access.
   - Ensure HTTP and worker layers share domain logic, respecting the layering described in `CODING_PRINCIPLES.md`.
2. **Follow the Roadmap**
   - Focus on optional stretch items (real external integrations, job processors, OpenAPI) unless new scope is added.
   - Document deviations in `ARCHITECTURE.md` if you change structure/tooling.
3. **Testing & Quality**
   - Extend unit tests under `tests/unit/**` and integration tests under `tests/integration/**` when adding behaviour.
   - Use Testcontainers helpers (`tests/helpers/containers.ts`) for DB/MinIO when validating flows end-to-end.
4. **Deployment Alignment**
   - Docker Compose (to be added) must mirror Render deployment (API + worker + Postgres + MinIO).
   - Environment variables should match `.env.example` (`MINIO_ENDPOINT` expects full URL, `MINIO_USE_SSL` is boolean).

## Reporting Back

- Summaries should cite relevant file paths/sections (e.g., `src/modules/survey/services/survey.service.ts:8`).
- Note any updates to key docs so the next agent can review changes quickly.
