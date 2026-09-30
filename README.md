<img width="1915" height="910" alt="Screenshot 2026-09-30 163132" src="https://github.com/user-attachments/assets/2b56ed6a-e8fe-4041-8f88-678a20d07e8b" /># JobPilot AI

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

See [`docs/deployment.md`](docs/deployment.md) for Docker Compose and
for running the agent on GitHub Actions while this PC is off. Each apply
emails a copy to `nourhb58@gmail.com`.

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
![Uploading Screenshot 2026-09-30 163132.<img width="1920" height="1502" alt="screencapture-localhost-5173-dashboard-2026-09-30-16_30_08" src="https://github.com/user-attachments/assets/7a86ffb0-a8f4-464a-bd46-4e879f5a2c45" />
<img width="1915" height="903" alt="Screenshot 2026-09-30 163114" src="https://github.com/user-attachments/assets/7d45786c-11ba-4d90-8228-0165b2a63853" />
<img width="1915" height="903" alt="Screenshot 2026-09-30 163124" src="https://github.com/user-attachments/assets/ba720647-0593-4b4b-8276-596b570285b3" />
png…]()
<img width="1915" height="903" alt="Screenshot 2026-09-30 163143" src="https://github.com/user-attachments/assets/23bff044-fd66-45d1-a697-b36df35e6008" />
<img width="1915" height="904" alt="Screenshot 2026-09-30 163150" src="https://github.com/user-attachments/assets/9ea0970c-0967-43f4-ba0c-61786729d075" />
<img width="1914" height="901" alt="Screenshot 2026-09-30 163159" src="https://github.com/user-attachments/assets/98376a73-56b2-4d86-a93b-ec70690772a3" />
<img width="1907" height="903" alt="Screenshot 2026-09-30 163209" src="https://github.com/user-attachments/assets/5e41eb5b-f53c-4cb4-ac36-f29c3dee82bc" />
<img width="1915" height="907" alt="Screenshot 2026-09-30 163216" src="https://github.com/user-attachments/assets/3bd7b882-6e8c-4b87-8c41-3946142ef825" />
<img width="1915" height="915" alt="Screenshot 2026-09-30 163103" src="https://github.com/user-attachments/assets/929e043e-cb5b-4a60-a113-4458fef7582f" />
