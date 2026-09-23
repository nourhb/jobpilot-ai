import "dotenv/config";
import { z } from "zod";

/**
 * All process.env access MUST go through this module. Validating once at
 * startup means a misconfigured deployment fails fast with a clear error
 * instead of crashing (or silently misbehaving) deep inside a request.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  APP_URL: z.string().url().default("http://localhost:5173"),
  API_URL: z.string().url().default("http://localhost:4000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters")
    .default("dev-only-insecure-secret-change-me-please-32chars"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  AI_PROVIDER: z.enum(["mock", "openai", "local"]).default("mock"),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),

  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  STORAGE_BUCKET: z.string().optional(),

  GREENHOUSE_ENABLED: z.coerce.boolean().default(false),
  LEVER_ENABLED: z.coerce.boolean().default(false),
  ASHBY_ENABLED: z.coerce.boolean().default(false),

  ENCRYPTION_KEY: z.string().default("dev-only-insecure-key-change-me-please"),

  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration. See errors above.");
}

if (parsed.data.NODE_ENV === "production") {
  const insecureDefaults: Array<[string, string]> = [
    ["JWT_SECRET", "dev-only-insecure-secret-change-me-please-32chars"],
    ["ENCRYPTION_KEY", "dev-only-insecure-key-change-me-please"],
  ];

  for (const [key, insecureValue] of insecureDefaults) {
    if (parsed.data[key as keyof typeof parsed.data] === insecureValue) {
      throw new Error(`${key} must be explicitly set in production (refusing to use the dev default).`);
    }
  }
}

export const env = parsed.data;
export type Env = typeof env;
