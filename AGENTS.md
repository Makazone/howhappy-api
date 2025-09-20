# Agent Guide

Use this document to get up to speed before working in this repository.

## Key References

- **Architecture**: See `ARCHITECTURE.md` for the system overview, request/job flow, deployment, project structure, and core tooling (Express, Prisma, pg-boss, MinIO, Render).
- **Coding Principles**: Follow the layered architecture, module boundaries, testing strategy, and error-handling rules in `CODING_PRINCIPLES.md`.
- **Roadmap**: `TODO.md` tracks the implementation plan. Phase 1 covers bootstrap/tooling/tests; Phase 2 delivers survey CRUD; optional stretch items follow.

## Current State

- Phase 1 (Project Bootstrap) completed ✅ - Full infrastructure scaffolding in place
- Phase 2 (Survey CRUD MVP) is next - Domain modules, auth, REST API endpoints
- Tooling decisions: Node.js 22, `pnpm`, TypeScript, Express 5, Prisma 6, pg-boss, zod, pino, Vitest/Testcontainers.

## Expectations for Agents

1. **Stay Within Architecture**
   - Keep controllers thin, call module services only, and use repositories for Prisma access.
   - Ensure HTTP and worker layers share domain logic, respecting the layering described in `CODING_PRINCIPLES.md`.
2. **Follow the Roadmap**
   - Prioritize outstanding tasks in `TODO.md`; update it if scope changes or work completes.
   - Document deviations in `ARCHITECTURE.md` if you make structural or tooling changes.
3. **Testing & Quality**
   - Provide unit and integration coverage as prescribed. Integration tests should use Testcontainers (Postgres + MinIO).
   - Mock external APIs (ElevenLabs/LLM) in tests and keep logging structured.
4. **Deployment Alignment**
   - Docker Compose must mirror Render deployment (API + worker + Postgres + MinIO).
   - Environment variables should match `.env.example` once created per the architecture doc.
5. **Commit Format**
   - Use conventional commit format: `type(scope): description`
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
   - Example: `feat(auth): implement JWT-based authentication`
   - Always include Claude Code attribution in commit body

## Reporting Back

- Summaries should cite relevant file paths/sections (e.g., `ARCHITECTURE.md:200` for deployment notes).
- Note any updates to key docs so the next agent can review changes quickly.
