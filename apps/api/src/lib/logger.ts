import pino from "pino";
import { env } from "../config/env";

/**
 * Central logger. See docs/security.md: never log CV content, passwords,
 * API keys, tokens, or full application answers. `redact` provides a
 * baseline safety net for the most common accidental leaks.
 */
export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
      : undefined,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "passwordHash",
      "*.password",
      "*.passwordHash",
      "AI_API_KEY",
      "JWT_SECRET",
      "ENCRYPTION_KEY",
    ],
    censor: "[REDACTED]",
  },
});
