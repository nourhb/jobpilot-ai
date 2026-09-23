# JobPilot AI

Autonomous Canadian job discovery, matching, application preparation,
permitted auto-application, cover-letter generation, application
tracking, and interview tracking.

> **Core principle:** the user's verified profile is the source of
> truth. The AI can summarize, rewrite, classify, match, personalize and
> generate — it can never invent experience, education, certifications,
> employment, skills, dates, or work-authorization claims. See
> [`docs/architecture.md`](docs/architecture.md).

## Status: Phase 1 — Foundation

This repository is built in phases (see `docs/architecture.md` →
"Development phases"). **Phase 1** is complete:

- ✅ pnpm monorepo (`apps/web`, `apps/api`, `packages/shared`,
  `packages/ai`, `packages/source-adapters`)
- ✅ React + Vite + TypeScript + Tailwind v4 + shadcn/ui frontend
- ✅ Node.js + Express + TypeScript API
- ✅ PostgreSQL + Prisma (`User`, `AuditLog` models)
- ✅ Docker Compose (`web`, `api`, `worker`, `postgres`, `redis`)
- ✅ Authentication: register / login / logout / session, Argon2 +
  JWT/httpOnly cookie, audit-logged
- ✅ AI provider abstraction (`AIProvider` interface) + `MockAIProvider`
  (no real API key configured — see `docs/security.md`)

Not implemented yet: candidate profile/CV upload, job discovery,
matching, cover letters, the application engine, the autonomous agent,
the dashboard, and everything else described in the full specification.
Building those now — against models and services that don't exist yet —
would mean faking functionality, which this project explicitly avoids.

## Quick start

```bash
pnpm install
cp .env.example .env
cp apps/web/.env.example apps/web/.env
docker compose up -d postgres redis
pnpm db:generate
pnpm db:migrate
pnpm db:seed        # optional demo account: demo@jobpilot.ai / DemoPassword123
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:4000/api/health

See [`docs/deployment.md`](docs/deployment.md) for the full Docker
Compose flow.

## Commands

```bash
pnpm dev            # web + api in parallel
pnpm build          # build/typecheck all packages
pnpm lint           # eslint across all packages
pnpm test           # unit tests across all packages
pnpm typecheck       # tsc --noEmit across all packages
pnpm db:migrate      # prisma migrate dev
pnpm db:seed         # seed a demo account (non-production only)
pnpm --filter api run test:integration   # requires postgres+redis running
docker compose up -d
```

## Repository structure

```text
apps/web/                React frontend
apps/api/                Express API
packages/shared/          Zod schemas + types shared by web & api
packages/ai/              AIProvider abstraction (Mock now; OpenAI/Local stubs)
packages/source-adapters/ JobSourceAdapter contract (Greenhouse/Lever/Ashby/Workable land in Phase 7)
prisma/                   schema.prisma + seed.ts
docker/                   Dockerfiles for web/api/worker
docs/                      architecture, api, security, deployment
```

## Documentation

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/api.md`](docs/api.md)
- [`docs/security.md`](docs/security.md)
- [`docs/deployment.md`](docs/deployment.md)
