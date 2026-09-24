import { createAIProvider, type AIProvider } from "@jobpilot/ai";
import { env } from "../config/env";

/**
 * Single shared AIProvider instance for the whole process, built from
 * `AI_PROVIDER`/`AI_API_KEY`/`AI_MODEL` (see docs/architecture.md, "AI
 * Provider Abstraction"). Every service that needs AI (resume parsing,
 * matching, cover letters, question answering, fact checking) takes this
 * via `getAIProvider()` rather than importing a concrete provider class,
 * so switching providers never touches business logic (Cursor rule #9).
 */
let singleton: AIProvider | undefined;

export function getAIProvider(): AIProvider {
  if (!singleton) {
    singleton = createAIProvider({ provider: env.AI_PROVIDER, apiKey: env.AI_API_KEY, model: env.AI_MODEL });
  }
  return singleton;
}
