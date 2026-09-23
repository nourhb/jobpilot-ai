import type {
  AICompletionRequest,
  AIProvider,
  AIStructuredRequest,
  AIStructuredResult,
  AITextResult,
} from "./types";
import { AIProviderNotImplementedError } from "./types";

/**
 * Placeholder for the real OpenAI-backed provider.
 *
 * Intentionally NOT implemented in Phase 1 (no API key is requested or
 * stored yet). Wiring the actual SDK call, retries, timeouts and
 * structured-output parsing is planned for a later phase. Every method
 * fails loudly rather than silently returning fabricated data.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";

  constructor(_config: { apiKey: string; model: string }) {}

  async generateText(_request: AICompletionRequest): Promise<AITextResult> {
    throw new AIProviderNotImplementedError(this.name, "a later phase (AI integration)");
  }

  async generateStructured<T>(_request: AIStructuredRequest<T>): Promise<AIStructuredResult<T>> {
    throw new AIProviderNotImplementedError(this.name, "a later phase (AI integration)");
  }

  async isHealthy(): Promise<boolean> {
    return false;
  }
}
