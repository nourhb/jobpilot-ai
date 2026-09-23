# Deployment (Phase 1: local Docker Compose)

## Local development (no Docker)

```bash
pnpm install
cp .env.example .env
cp apps/web/.env.example apps/web/.env
docker compose up -d postgres redis   # or run your own local instances
pnpm db:generate
pnpm db:migrate
pnpm db:seed          # optional: creates demo@jobpilot.ai / DemoPassword123
pnpm dev              # runs apps/web + apps/api in parallel
```

- Web: http://localhost:5173
- API: http://localhost:4000
- Health checks: http://localhost:4000/api/health(/database|/redis|/ai)

## Full stack via Docker Compose

```bash
cp .env.example .env      # edit JWT_SECRET / ENCRYPTION_KEY before production use
docker compose up -d --build
docker compose exec api pnpm run db:migrate:deploy
```

Services: `web` (nginx, port 5173→80), `api` (port 4000), `worker`
(no exposed port — Phase 1 placeholder, see `apps/api/src/worker.ts`),
`postgres` (5432), `redis` (6379).

The root `.env` is written for **local (non-Docker) dev**, where
`DATABASE_URL`/`REDIS_URL` correctly point at `localhost`. Containers
cannot resolve `localhost` to sibling containers, so `docker-compose.yml`
overrides `DATABASE_URL`/`REDIS_URL` for the `api` and `worker` services
via an explicit `environment:` block pointing at the `postgres`/`redis`
service names — this takes precedence over the plain `env_file: .env`
values. If you add new env-driven connection strings, override them the
same way rather than assuming `.env`'s values are container-safe.

## Known issue: Prisma CLI on native Windows

`prisma migrate dev`, `prisma db pull`, and (in some configurations)
`@prisma/client` query execution can fail with a client-side
`P1000: Authentication failed` error when run directly on native Windows
(outside Docker/WSL), even with verified-correct credentials — Postgres's
own logs show zero incoming connection attempts, meaning the failure
never reaches the network. Root cause is unconfirmed (suspected
Windows/Node interaction with Prisma's connection layer); it is not a
schema, credentials, or Postgres configuration problem.

**Workaround:** run any command that talks to a live database from a
Linux context — either Docker Desktop's WSL2 backend, or a disposable
container on the compose network, e.g.:

```bash
docker run --rm --network jobpilot-ai_default \
  -e DATABASE_URL="postgresql://jobpilot:jobpilot@postgres:5432/jobpilot" \
  -v "${PWD}:/app" -w /app/apps/api \
  node:20-slim sh -c "corepack enable && pnpm install --frozen-lockfile && pnpm exec prisma migrate dev --schema ../../prisma/schema.prisma"
```

`prisma generate` (schema-only, no live connection) works fine natively
on Windows and does not need this workaround.

**Do not run `prisma db pull` / `prisma db pull --force` against
`prisma/schema.prisma`** as a debugging step — introspection overwrites
the file in place with auto-generated model names derived from the raw
SQL table names (e.g. `model users` / `model audit_logs` with no
`@@map()`), discarding the hand-authored PascalCase model names
(`User`, `AuditLog`) our repositories rely on (`prisma.user`,
`prisma.auditLog`). If this ever happens, restore the model/field names
from `prisma/migrations/*/migration.sql` (which is unaffected) rather
than keeping the introspected schema.

## Not yet implemented

- CI/CD (GitHub Actions lint/test/build/scan/deploy) — **Phase 10**.
- Cloud VM / Nginx reverse proxy in front of the compose stack —
  **Phase 10**.
- Kubernetes/k3s manifests, Prometheus/Grafana — **Phase 11**.
