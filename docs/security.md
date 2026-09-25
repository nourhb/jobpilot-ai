# Security (Phase 10)

## Implemented in Phase 1

- **Password hashing:** Argon2 (`argon2` package), never plaintext or a
  fast hash (bcrypt/sha256).
- **Sessions:** JWT (`JWT_SECRET`, min 32 chars, no insecure default
  allowed when `NODE_ENV=production` — enforced in `src/config/env.ts`),
  delivered via `httpOnly`, `sameSite=lax` cookie (`secure` in
  production).
- **Login timing:** constant-time-ish credential check — `argon2.verify`
  always runs (against a dummy hash if the account doesn't exist) so
  response timing doesn't reveal whether an email is registered.
- **Transport hardening:** `helmet()`, `cors()` restricted to
  `CORS_ORIGIN`, `express.json({ limit: "1mb" })`.
- **Rate limiting:** global (300 req/15min) + stricter auth-specific
  limiter (20 req/15min) via `express-rate-limit`.
- **Input validation:** every request body validated with Zod schemas
  from `@jobpilot/shared` (frontend forms use the exact same schemas).
- **No secrets in the frontend:** `apps/web` only ever reads
  `VITE_`-prefixed variables (`src/config/env.ts` is the single place
  that touches `import.meta.env`). `AI_API_KEY`, `JWT_SECRET`,
  `ENCRYPTION_KEY`, `DATABASE_URL`, `REDIS_URL` never leave the API.
- **Structured error handling:** `middleware/errorHandler.ts` never
  leaks internal error messages/stack traces to the client; everything
  is logged server-side instead (Cursor rule #22 — never silently
  swallow errors).
- **Log redaction:** `lib/logger.ts` redacts `Authorization`/`Cookie`
  headers and any `password`/`passwordHash` fields; `AuditLog.metadata`
  is populated only with non-sensitive fields by callers.

## Added in later phases

- **CV/document upload validation (Phase 2):** MIME + extension + magic
  bytes + 10MB cap + UUID rename (`apps/api/src/documents`).
- **Field-level encryption helper (Phase 10):** `encryptField` /
  `decryptField` (AES-256-GCM) using `ENCRYPTION_KEY`. Existing
  Profile/User columns stay plaintext so Truth Layer comparisons stay
  exact; new secrets can use the helper without a rewrite.
- **CSRF / Origin check (Phase 10):** mutating cookie-authenticated
  requests must come from `CORS_ORIGIN` / `APP_URL`. Bearer tokens skip
  the check (API clients). Missing Origin is allowed only outside
  production.
- **Account deletion (Phase 10, section 85):** `DELETE /api/account`
  stops the agent, deletes resume files, writes `ACCOUNT_DELETED`, then
  cascades the user row.
- **Production probes (Phase 10):** `GET /api/health` (liveness) and
  `GET /api/ready` (Postgres + Redis, no error details in production)
  stay mounted in production. Detailed `/api/health/database|/redis|/ai`
  remain development-only.
- **CI (Phase 10):** GitHub Actions runs typecheck, lint, unit tests,
  `pnpm audit --audit-level=high`, and Docker image builds. No cloud
  deploy (`local_only`).
- **Docker hardening (Phase 10):** non-root `node` user, storage dir
  ownership, API HEALTHCHECK, hardened nginx headers,
  `docker-compose.prod.yml` (Postgres/Redis not published).

## Standing rules (apply to every future phase)

- Never bypass CAPTCHA, authentication, or anti-bot controls (see the
  project's Agent Safety Rules, RULE-002/003/004).
- Never log CV content, full application answers, passwords, or API
  keys.
- Never fabricate candidate information — the verified profile
  (`VerifiedCandidateProfile`, introduced in Phase 2) is the only source
  of truth for anything submitted to an employer.
