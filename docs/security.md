# Security (Phase 1 baseline)

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

## Explicitly deferred to later phases (not implemented yet — do not assume otherwise)

- CV/document upload validation (MIME + extension + file signature +
  size, UUID renaming) — **Phase 2**.
- Encryption at rest for sensitive candidate data (`ENCRYPTION_KEY` is
  wired into env validation now but nothing encrypts with it yet) —
  **Phase 2+**.
- CSRF protection — needed once the app has state-changing GET-adjacent
  flows beyond simple cookie+bearer auth; revisit when the dashboard's
  form surface grows — **Phase 9/10**.
- Full production hardening checklist (secret rotation, dependency
  scanning, security scan in CI) — **Phase 10**.

## Standing rules (apply to every future phase)

- Never bypass CAPTCHA, authentication, or anti-bot controls (see the
  project's Agent Safety Rules, RULE-002/003/004).
- Never log CV content, full application answers, passwords, or API
  keys.
- Never fabricate candidate information — the verified profile
  (`VerifiedCandidateProfile`, introduced in Phase 2) is the only source
  of truth for anything submitted to an employer.
