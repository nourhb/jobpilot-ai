# Architecture

JobPilot AI is an autonomous Canadian job discovery, matching, application
preparation, permitted auto-application, cover-letter generation,
application tracking, and interview tracking platform.

## Core principle

> **The LLM is not the source of truth.** The user's verified profile is.

The AI may summarize, rewrite, classify, match, personalize and generate.
It may never invent experience, education, certifications, employment,
skills, dates, or claims of work authorization. See
`packages/ai/src/providers` for the provider abstraction and
`docs/security.md` for the anti-fabrication rules that later phases build
on top of it (Fact Checker, Application Policy Engine).

## High-level system

```text
                         INTERNET
                            |
                      HTTPS / TLS
                            |
                    ┌──────────────┐
                    │ React / Vite │   apps/web
                    │ Web Frontend │
                    └──────┬───────┘
                           |
                      REST / JSON
                           |
                    ┌──────▼───────┐
                    │ Node.js API   │  apps/api
                    │   Express     │
                    └──────┬────────┘
                           |
       ┌───────────────────┼───────────────────┐
       |                   |                   |
       ▼                   ▼                   ▼
 PostgreSQL             Redis             Object Storage
  (Prisma)          (health now,               (Phase 2+)
                      BullMQ Phase 8)
                           |
                    ┌──────▼────────┐
                    │ Worker Engine │   apps/api/src/worker.ts
                    └───────────────┘
```

## Monorepo layout

```text
jobpilot-ai/
├── apps/
│   ├── web/                  React + Vite + TS + Tailwind v4 + shadcn/ui
│   └── api/                  Express + TS + Prisma
├── packages/
│   ├── shared/                Zod schemas, types, constants shared by web+api
│   ├── ai/                    AIProvider abstraction (Mock now; OpenAI/Local stubs)
│   └── source-adapters/       JobSourceAdapter contract (base types only so far)
├── prisma/                    schema.prisma + seed.ts (single source of truth for the DB)
├── docker/                    Dockerfile.web / Dockerfile.api / Dockerfile.worker
├── docker-compose.yml
└── docs/
```

## apps/api layered architecture

```text
controllers/   -> services/   -> repositories/ -> Prisma
```

Controllers never import Prisma directly. Only `repositories/*` import
`lib/prisma.ts`. External integrations (AI providers, job source
adapters) are isolated behind interfaces (`packages/ai`,
`packages/source-adapters`) so business logic never depends on a
concrete vendor SDK.

Feature folders (`profile/`, `documents/`, `jobs/`, `application/`,
`ai/`, `adapters/`, `workers/`) exist as directory scaffolding today with
a `PHASE_NOTE.md` explaining what lands there and in which phase — see
"Development Phases" below. Only `audit/` (audit logging for auth
events) has real code in Phase 1.

## AI provider abstraction

```text
AIProvider (interface)
├── MockAIProvider     — deterministic, offline, used by default + tests
├── OpenAIProvider     — throws AIProviderNotImplementedError (Phase 2+)
└── LocalProvider      — throws AIProviderNotImplementedError (Phase 2+)
```

`createAIProvider({ provider, apiKey, model })` in
`packages/ai/src/providers/index.ts` is the only place that chooses a
concrete implementation. Nothing else in the codebase should import a
concrete provider class directly.

## Application state machine (target — implemented starting Phase 6)

```text
DISCOVERED → NORMALIZED → MATCHED → QUALIFIED → PREPARING → VALIDATING
  → READY → SUBMITTING → SUBMITTED

Failure states: SKIPPED, BLOCKED, MANUAL_REVIEW, FAILED, DUPLICATE, EXPIRED
```

Defined centrally now in `packages/shared/src/constants/index.ts`
(`APPLICATION_STATES`) so the vocabulary is fixed before the engine that
uses it is built.

## Authentication (Phase 1)

- Password hashing: Argon2 (`argon2` package).
- Session: JWT signed with `JWT_SECRET`, returned in the response body
  **and** set as an `httpOnly`, `sameSite=lax` cookie (`secure` in
  production). The frontend relies on the cookie; the token in the body
  exists for non-browser API clients / tests.
- Login timing is constant regardless of whether the email exists
  (`argon2.verify` always runs, against a dummy hash if needed) to avoid
  leaking account existence via response timing.
- Every register/login/login-failure/logout event is written to
  `AuditLog` (never with the password or token).

## Development phases

See the project's technical specification for the full list; the phases
implemented so far:

- **Phase 1 (done):** monorepo, React, Node/Express, PostgreSQL,
  Prisma, Docker, Authentication.
- **Phase 2 (done):** Profile, CV upload, CV parser, Truth database
  (`VerifiedCandidateProfile`).
- **Phase 3 (done):** Job source architecture (`JobSourceAdapter`,
  `SourceAdapterRegistry`), raw → `NormalizedJob` normalization
  dispatch, three-layer deduplication (unique `(sourceId, externalId)`,
  `secondaryDedupeKey`, `contentHash`), idempotent
  `jobDiscoveryService` (upserts, bumps `lastSeenAt` on re-discovery
  instead of duplicating), `Job`/`JobSource` Prisma models, read-only
  `GET /api/jobs` + `GET /api/jobs/:id`, dev-only `GET /api/sources`
  diagnostic endpoint, `MockJobSourceAdapter` with 3 fixture jobs
  proving the pipeline end-to-end. Real Lever/Ashby/Greenhouse
  adapters are deferred to Phase 7; a manual
  `pnpm --filter api run discover:run` script exists to trigger
  discovery locally until Phase 8's scheduled worker replaces it.
- **Phase 4 (done):** `JobPreference` model (`GET`/`PUT /api/preferences`)
  and job matching (`GET /api/jobs/:id/match`). Section 26's hybrid
  score is 100% deterministic (apps/api/src/matching/scoring.ts) --
  skills/experience/title/location/authorization/salary/employment-type/
  preferences components, each independently documented and unit
  tested. Hard filters (apps/api/src/matching/hardFilters.ts, section
  27) run first and skip a job before it is ever scored. The AI
  provider (packages/ai/src/matching) is only ever asked to narrate an
  already-computed score (reasons/missingRequirements/riskFlags) --
  `JobMatch.decision`, the system's authoritative APPLY/REVIEW/SKIP
  call, is derived from the score vs. the user's own
  `minimumMatchScore`, never from the AI's advisory
  `aiSuggestedDecision`. Minimal `/jobs`, `/jobs/:id`, and
  `/preferences` frontend pages replace their Phase 3/4 "coming soon"
  placeholders.
- **Phase 5 (done):** Cover Letter Generator, Application Question
  Engine, and the Fact Checker (sections 29-33, 37) -- implemented as
  pure, testable services, not yet wired to a route or persisted to a
  table. The spec's own `CoverLetter`/`ApplicationAnswer` models are
  FK'd to `Application`, which doesn't exist until Phase 6, so
  persistence for both is deferred there; this phase focuses entirely
  on the generation/validation logic Phase 6's Application Engine will
  call.
  - `generateCoverLetter` (packages/ai/src/coverLetter) -- text
    generation (the first `AIProvider.generateText` consumer in the
    codebase; every prior AI call used `generateStructured`), grounded
    only in the verified profile + job + optional match context.
  - The Application Question Engine (apps/api/src/questions) is a
    3-stage pipeline: `classifyQuestion` (deterministic keyword
    classification into the spec's 9 categories -- HIGH_RISK detection
    in particular must be reliable, not probabilistic, so it is never
    AI-driven) -> `retrieveFact` (direct lookup against the verified
    profile; returns "not found" rather than ever guessing) ->
    `generateAnswerForQuestion` (orchestrator). LEGAL questions
    (work authorization/sponsorship) are answered directly from
    `profile.authorization` and never reach the AI, exactly as section
    32 specifies. MOTIVATIONAL questions (and descriptive experience
    questions grounded on a verified-present skill) are the only ones
    routed through `generateMotivationalAnswer`.
  - `checkFacts` (packages/ai/src/factChecker) implements the
    Anti-Fabrication Validator (section 37): every AI-generated answer
    is checked against the verified profile before
    `generateAnswerForQuestion` will ever return it: a failed check
    BLOCKs the answer instead of surfacing a fabricated claim.
  - Unit tests reproduce the spec's own section 61 examples verbatim
    (e.g. "AWS = 0" -> "NO", not BLOCK; "Terraform absent, describe
    your experience" -> BLOCK; "Open Work Permit, are you legally
    authorized" -> YES) to keep the implementation honest against the
    spec's stated expectations, not just internal consistency.

- **Phase 6 (done):** The Application Engine, Mock ATS, Validator, and
  Policy Engine (sections 34-38, 42, 60, 76-78) -- the phase where
  Phases 4 and 5 are wired together into real `Application` rows for
  the first time.
  - `Application`/`CoverLetter`/`ApplicationAnswer`/`ApplicationEvent`
    (apps/api/src/applications/) -- `CoverLetter`/`ApplicationAnswer`
    were deliberately deferred out of Phase 5 specifically so they
    could be FK'd to `Application` here, per the spec's own model
    design. `jobSnapshot`/`candidateSnapshot` are immutable JSON
    captured once at creation (master prompt: "keep immutable
    snapshots..."); `ApplicationEvent` is the append-only "TIMELINE"
    the section 45 UI needs. `idempotencyKey` +
    `@@unique([userId, jobId])` implement section 42 exactly --
    `applicationService.createAndProcess` returns the existing row
    instead of ever creating a second one for the same (user, job).
  - Mock ATS (apps/api/src/mockAts, section 60): a genuinely separate
    HTTP surface (`/api/_mock-ats/*`, dev-only, gated the same way as
    `/api/sources`) with `/jobs/:externalId`,
    `/jobs/:externalId/questions`, and
    `POST /jobs/:externalId/applications`. `mockAtsAdapter`
    (apps/api/src/applications/adapters) is a real `fetch`-based HTTP
    client against it -- deliberately built the same shape Phase 7's
    real Lever/Ashby/Greenhouse adapters will use, so this phase
    exercises genuine network/error-handling code (CAPTCHA-as-409,
    non-2xx responses), not just in-process function calls. Every
    behavior (success, CAPTCHA, source-down, an unanswerable/
    high-risk question) is driven by a substring marker in the job's
    own `externalId` -- no hidden state.
  - `resolveApplicationAdapter` (section 38's `ApplicationRouter`)
    resolves an adapter only for `MOCK`-sourced jobs today; every real
    ATS source type resolves to `null`, which
    `application.service.ts` treats as an automatic MANUAL_REVIEW --
    "if an application cannot safely or legitimately be automated,
    create a MANUAL_REVIEW task" (master prompt), directly explaining
    why real job-board applications will stay in manual review until
    Phase 7.
  - `applicationValidator.ts` (section 36) reproduces the spec's own
    PASS/FAIL checklist verbatim. `policyEngine.ts`
    (`evaluateApplication`, section 78) enforces section 76's
    hard-coded safety rules (RULE-001 through RULE-010), distinguishing
    a hard stop (duplicate/expired/out-of-scope -> straight to a
    terminal status, no human needed) from a soft stop that needs a
    human (an unanswerable question, an unsupported source ->
    `requiresManualReview: true`, matching the spec's own worked
    example exactly).
  - Section 77's "Zero Mistake" architecture is enforced structurally,
    not just by convention: `application.service.ts` has no code path
    from an AI-generated cover letter or question answer directly to
    `adapter.submit()` -- everything passes through
    `validateApplication` AND `evaluateApplication` first.
  - No new user-facing "create application" route exists (the spec's
    own route list only has list/detail/retry/skip) -- Applications
    are meant to be created by the Phase 8 agent scheduler. A
    `pnpm --filter api run apply:run <email> <jobId>` script is the
    interim manual trigger, the same stopgap role `discover:run` plays
    for Phase 3.
  - Verified end-to-end via Docker Compose against a live Postgres
    database: a real Application row progressed
    QUALIFIED -> PREPARING -> VALIDATING -> MANUAL_REVIEW (a numeric
    experience question correctly BLOCKed since the candidate's
    verified Kubernetes skill had no `yearsExperience` on file, and no
    resume/phone were on file either); re-running was confirmed
    idempotent (same Application id, no duplicate row); `retry`
    correctly replaced the prior attempt's answers rather than
    accumulating duplicates; `GET /api/applications` (with a `status`
    filter) and `POST /api/applications/:id/skip` were both exercised
    successfully over real HTTP.

- **Phase 7 (done):** Real Greenhouse/Lever/Ashby adapters (sections
  14-18), fixture-tested only, per the project's `unit_fixtures`
  decision -- real HTTP clients, never called against a live employer.
  - Each source (`packages/source-adapters/src/adapters/{greenhouse,lever,ashby}/`)
    is a plain `fetch`-based client against that platform's real,
    public, documented, unauthenticated API (Greenhouse's Job Board
    API, Lever's Postings API, Ashby's Job Posting API -- the exact
    URLs section 1/17/18 cite), composed into a `JobSourceAdapter`
    (section 14) internally organized as the four named responsibilities
    each source's own spec section calls for (e.g.
    `LeverDiscoveryService`/`LeverJobDetailsService`/
    `LeverApplicationFormService`/`LeverApplicationService`).
  - **Greenhouse's `submitApplication` is deliberately left
    unimplemented** -- its public Job Board API is read-only; real
    submission requires a private, per-employer Harvest API key this
    project does not have. A Greenhouse-sourced job therefore always
    resolves to no submission adapter, same as before Phase 7, which
    `application.service.ts` correctly turns into MANUAL_REVIEW.
    Lever and Ashby *do* implement `submitApplication`, matching the
    spec's own explicit claim that both document a public
    form-retrieval + submission flow; a 403/429 from either is treated
    as an anti-bot signal (never a bypass attempt) and surfaced as
    `MANUAL_REVIEW_REQUIRED`, not retried.
  - `normalizeGreenhouseJob`/`normalizeLeverJob`/`normalizeAshbyJob`
    (`packages/source-adapters/src/normalize/`) are wired into
    `normalizeRawJob`'s dispatcher (section 19). Greenhouse jobs
    normalize to `application.type: "MANUAL"` (matching its read-only
    reality); Lever/Ashby normalize to `"API"`.
  - `sourceAdapterRegistry` (section 15) now creates real Greenhouse/
    Lever/Ashby adapters from a `JobSource.config` (board token /
    company slug / job board name) -- registering a factory only makes
    the registry *able* to build the adapter; it causes no network
    traffic by itself.
  - Two independent, coarse kill switches gate any actual outbound call
    to a real employer, both defaulting to off (`local_only` decision):
    `apps/api/src/adapters/registry.ts` (discovery) and
    `apps/api/src/applications/adapters/applicationRouter.ts`
    (submission) both check `GREENHOUSE_ENABLED`/`LEVER_ENABLED`/
    `ASHBY_ENABLED` (`.env.example`, defined since Phase 1) before ever
    resolving a real adapter -- disabled means the exact same behavior
    as before Phase 7 (discovery: a clean per-source error, not a
    crash; submission: MANUAL_REVIEW).
  - `sourceAdapterBridge.ts` (apps/api) adapts any
    `JobSourceAdapter` that implements `getApplicationForm`/
    `submitApplication` into the `ApplicationAdapter` shape
    `application.service.ts` (Phase 6) already knows how to drive --
    so the "Zero Mistake" pipeline built in Phase 6 needed zero changes
    to gain real submission support; only `resolveApplicationAdapter`
    grew two new cases.
  - 71 new tests (adapters, normalizers, registry wiring, env-flag
    gating, the bridge) verified entirely against realistic recorded
    fixtures -- no test in this phase makes a real network call.

- **Phase 8 (done):** BullMQ queues, Redis workers, and the
  AgentScheduler (sections 39-42).
  - All nine queue names from section 40 exist as stable constants
    (`apps/api/src/queues/queueNames.ts`). Only four are consumed by
    live workers: `job-discovery`, `job-matching`,
    `application-preparation`, and `agent-tick` (plus a no-op
    `notifications` stub reserved for Phase 9). The finer-grained
    cover-letter / validation / submission / verification queues are
    *not* separate workers -- those stages already live inside
    `application.service.ts` (Phase 6) so there is never an
    `LLM -> Submit` hop across a queue boundary, which would break
    section 77's Zero Mistake architecture.
  - `agentScheduler.service.ts` (section 39) is pure orchestration: it
    never submits. Auto-apply only *enqueues* an application job, and
    only when the system's own match decision is APPLY, the user has
    `autoApplyEnabled`, the job's source is on
    `allowedSourceTypes` (empty = no restriction), no Application row
    already exists (section 42), and the rolling
    `maxApplicationsPerDay` / `maxApplicationsPerHour` caps have
    headroom. REVIEW/SKIP never auto-apply. Manual `apply:run` is
    never rate-limited by these caps.
  - Repeatable jobs (`DISCOVERY_INTERVAL_MINUTES`, default 30;
    `AGENT_TICK_INTERVAL_MINUTES`, default 5) are registered by the
    worker process only -- the API process never starts workers, so a
    stuck submit cannot block HTTP. `pnpm --filter api run agent:run`
    is the in-process local stopgap (same role as `discover:run` /
    `apply:run`), so Phase 8 is testable without cloud credentials
    (`local_only`).
  - BullMQ jobIds (`match:${userId}:${jobId}`,
    `apply:${userId}:${jobId}`) plus Application's existing
    `idempotencyKey` / `@@unique([userId, jobId])` make every worker
    idempotent (section 41/42): a crash-and-retry cannot submit twice.

Phases 9–11 (dashboard, production security/CI, Kubernetes) are
intentionally not started yet.
