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

## Health and metrics

| Route | Availability | Checks |
| --- | --- | --- |
| `GET /api/health` | always | Process liveness |
| `GET /api/ready` | always | PostgreSQL `SELECT 1` + Redis `PING` (no error details in production) |
| `GET /api/metrics` | always | Prometheus text (`jobpilot_up`, `jobpilot_http_requests_total`) |
| `GET /api/health/database` | development | `SELECT 1` against PostgreSQL |
| `GET /api/health/redis` | development | Redis `PING` |
| `GET /api/health/ai` | development | Configured `AIProvider.isHealthy()` |

## Account

### `DELETE /api/account`

Requires authentication. Stops the agent, deletes on-disk resume files,
writes `ACCOUNT_DELETED`, then deletes the user (cascaded rows). Clears
the session cookie.

Response `200`: `{ deleted: true }`.

Errors: `401 UNAUTHENTICATED`, `403 CSRF_REJECTED` (cookie request from
an unexpected Origin).

Cookie-authenticated `POST`/`PUT`/`PATCH`/`DELETE` requests must send
`Origin` matching `CORS_ORIGIN` or `APP_URL`. `Authorization: Bearer`
clients skip the Origin check.
