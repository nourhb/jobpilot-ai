import type {
  AICompletionRequest,
  AIProvider,
  AIStructuredRequest,
  AIStructuredResult,
  AITextResult,
} from "./types";
import { AIProviderNotImplementedError } from "./types";

/**
 * Placeholder for a self-hosted / local model provider (e.g. Ollama).
 * Not implemented in Phase 1. See OpenAIProvider for rationale.
 */
export class LocalProvider implements AIProvider {
  readonly name = "local";

  constructor(_config: { baseUrl: string; model: string }) {}

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
