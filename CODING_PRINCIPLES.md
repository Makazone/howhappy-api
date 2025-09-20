# Coding Principles

These guidelines capture how we structure application code so the MVP stays easy to change while leaving room to grow.

## Layered Architecture

- **Application Layer**
  - Lives in `modules/*/service.ts` and `app/http` / `app/jobs` orchestrators.
  - Coordinates use cases, handles transactions, and manages task progress.
  - Delegates all business rules to the domain layer and never persists data directly.

- **Domain Layer**
  - Encapsulates business concepts, invariants, and state (entities, value objects, domain services).
  - Exposed through module repositories/services so both web and worker entry points reuse the same logic.
  - Guards rules such as “an analysis cannot start until audio upload is complete.”

- **Infrastructure Layer**
  - Provides adapters around external concerns (Prisma, pg-boss, MinIO, ElevenLabs, LLM APIs).
  - Implements interfaces consumed by the application/domain layers; swapping providers should only touch this layer.

## Module Organization

- Each feature module (`modules/auth`, `modules/survey`, `modules/response`) contains:
  - `schema.ts` and `dto/` for validation and request/response shapes.
  - `service.ts` for application logic that composes domain operations.
  - `repository.ts` for Prisma data access (one place per module that knows about the database schema).
- Controllers (`app/http/controllers`) and job handlers (`app/jobs/*`) call module services only—never repositories directly.
- Shared utilities belong in `shared/` and must remain free of business rules.

## Persistence & Models

- Keep a single `prisma/schema.prisma` during the MVP phase for easier review and tooling support.
- Use Prisma migrations for all schema changes; never run ad-hoc SQL against production databases.
- Map Prisma models to domain entities via module repositories so changes to storage don’t leak into controllers or jobs.

## Background Work

- Queue handlers load and persist state through module services just like HTTP controllers.
- Long-running jobs must catch and rethrow domain errors using structured failure types so retries and alerts behave predictably.
- Configure pg-boss retries and concurrency per queue within `app/jobs/*/index.ts`; avoid hard-coding those settings elsewhere.

## Testing

- **Unit tests** target module services, repositories (with in-memory fakes), and domain helpers.
- **Integration tests** spin up the Express app via `app.ts` and use real Postgres/MinIO containers to cover end-to-end flows.
- **Worker tests** enqueue jobs against a disposable database and assert on the resulting state.
- Tests should mock external HTTP calls (ElevenLabs, LLM providers) with `nock` or `msw` to stay deterministic.

## Auth & Security

- The auth module exposes a thin interface (`AuthService`) used by middleware and controllers.
- All tokens (user JWTs, response tokens) are signed via a single config entry and include scope-expiration claims.
- Input validation happens at the edge (controllers/middleware) using shared zod schemas; domain services still enforce critical invariants defensively.

## Logging & Error Handling

- Use structured logs (pino) with request/job IDs; never log secrets or full JWTs.
- Application layer catches domain errors and converts them into HTTP or job responses; unexpected errors propagate to global handlers that log and surface alarms.
- Prefer custom error classes (`shared/errors`) to magic strings.

## Extensibility

- External clients (storage, queues, AI providers) are created via factories in `infrastructure/` and injected into modules.
- When adding a new feature, start by defining the domain model and repository, then expose application services, and finally add HTTP or job adapters.
- Document deviations from these principles in `ARCHITECTURE.md` to keep future work aligned.
