// Ensures env validation (src/config/env.ts) has sane values during tests
// even if the developer has no .env file yet.
process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??= "postgresql://jobpilot:jobpilot@localhost:5432/jobpilot_test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_SECRET ??= "test-only-secret-that-is-at-least-32-characters-long";
process.env.ENCRYPTION_KEY ??= "test-only-encryption-key";
process.env.CORS_ORIGIN ??= "http://localhost:5173";
