# HowHappy

Survey collection system with audio transcription and analysis.

## Prerequisites

- Node.js 22.x
- pnpm
- PostgreSQL (or Docker for running containers)
- MinIO (or Docker for running containers)

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Generate Prisma client:

```bash
pnpm prisma:generate
```

4. Run database migrations:

```bash
pnpm prisma:migrate:dev
```

## Development

Start the API server:

```bash
pnpm dev
```

Start the worker:

```bash
pnpm worker
```

## Testing

Run all tests:

```bash
pnpm test
```

Run unit tests only:

```bash
pnpm test:unit
```

Run integration tests (requires Docker):

```bash
pnpm test:integration
```

## Scripts

- `pnpm dev` - Start development server
- `pnpm worker` - Start worker process
- `pnpm build` - Build TypeScript
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm lint` - Run ESLint and Prettier checks
- `pnpm format` - Format code with Prettier
- `pnpm test` - Run tests
- `pnpm prisma:generate` - Generate Prisma client
- `pnpm prisma:migrate:dev` - Run database migrations (development)
- `pnpm prisma:studio` - Open Prisma Studio

## Docker Compose (Coming Soon)

Docker Compose configuration for local development with PostgreSQL and MinIO will be added in the next phase.

## Project Structure

```
src/
├── app/                  # Application layer
│   ├── bootstrap/        # Express and pg-boss setup
│   └── http/            # HTTP routes and controllers (Phase 2)
├── infrastructure/       # Infrastructure adapters
│   ├── database/        # Prisma client
│   ├── external/        # External API clients
│   └── storage/         # MinIO client
├── modules/             # Domain modules (Phase 2)
├── shared/              # Shared utilities
│   ├── config/          # Environment configuration
│   └── logging/         # Logger setup
├── worker/              # Background job workers
├── app.ts               # Express app builder
└── server.ts            # HTTP server entrypoint
```

## Architecture

See `ARCHITECTURE.md` for detailed system architecture documentation.
