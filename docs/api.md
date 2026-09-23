# API Reference (Phase 1)

Base URL: `API_URL` (default `http://localhost:4000`). All responses use
the envelope:

```ts
type ApiResponse<T> = { success: true; data: T } | { success: false; error: { code: string; message: string; details?: unknown } };
```

## Auth

### `POST /api/auth/register`

Body (validated by `@jobpilot/shared` `registerSchema`):

```json
{ "email": "jane@example.com", "password": "StrongPass123", "firstName": "Jane", "lastName": "Doe" }
```

Password must be 10–128 characters with at least one uppercase letter,
one lowercase letter, and one digit.

Response `201`: `{ user: PublicUser, accessToken: string }`. Also sets an
`httpOnly` session cookie.

Errors: `400 VALIDATION_ERROR`, `409 EMAIL_ALREADY_REGISTERED`.

### `POST /api/auth/login`

Body: `{ "email": string, "password": string }`.

Response `200`: `{ user: PublicUser, accessToken: string }`.

Errors: `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`.

### `POST /api/auth/logout`

Requires authentication (cookie or `Authorization: Bearer <token>`).
Clears the session cookie. Response `200`: `{ message: string }`.

### `GET /api/auth/me`

Requires authentication. Response `200`: `{ user: PublicUser }`.
Errors: `401 UNAUTHENTICATED`.

Rate limiting: `/api/auth/register` and `/api/auth/login` are limited to
20 requests / 15 minutes per IP (`TOO_MANY_REQUESTS`).

## Health (development only — not mounted when `NODE_ENV=production`)

| Route | Checks |
| --- | --- |
| `GET /api/health` | Process liveness |
| `GET /api/health/database` | `SELECT 1` against PostgreSQL |
| `GET /api/health/redis` | Redis `PING` |
| `GET /api/health/ai` | Configured `AIProvider.isHealthy()` |

## Not implemented yet

Everything under `/api/profile`, `/api/preferences`, `/api/jobs`,
`/api/applications`, `/api/agent` is defined in the project specification
but arrives in later phases, once the corresponding Prisma models and
services exist. Building the routes ahead of the data they operate on
would mean either faking responses or leaving dead code — both against
the project's development rules.
