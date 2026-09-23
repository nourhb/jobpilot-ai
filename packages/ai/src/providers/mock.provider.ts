import type {
  AICompletionRequest,
  AIProvider,
  AIStructuredRequest,
  AIStructuredResult,
  AITextResult,
} from "./types";
import { AIProviderError } from "./types";

/**
 * Deterministic, offline AI provider used in development and tests.
 *
 * - `generateText` returns a canned string unless a response has been
 *   queued via `queueTextResponse`.
 * - `generateStructured` validates a queued (or empty) payload against the
 *   caller-supplied Zod schema, so tests can assert real validation
 *   behaviour without hitting a network provider.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  private textQueue: string[] = [];
  private structuredQueue: unknown[] = [];

  queueTextResponse(content: string): void {
    this.textQueue.push(content);
  }

  queueStructuredResponse(data: unknown): void {
    this.structuredQueue.push(data);
  }

  async generateText(request: AICompletionRequest): Promise<AITextResult> {
    const content = this.textQueue.shift() ?? `[mock:${request.promptVersion}] ${request.userPrompt.slice(0, 120)}`;

    return {
      content,
      model: "mock-1",
      promptVersion: request.promptVersion,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    };
  }

  async generateStructured<T>(request: AIStructuredRequest<T>): Promise<AIStructuredResult<T>> {
    const candidate = this.structuredQueue.shift() ?? {};
    const parsed = request.schema.safeParse(candidate);

    if (!parsed.success) {
      throw new AIProviderError(
        `Mock structured response failed schema validation for promptVersion "${request.promptVersion}": ${parsed.error.message}`,
        this.name,
        parsed.error,
      );
    }

    return {
      data: parsed.data,
      model: "mock-1",
      promptVersion: request.promptVersion,
      raw: JSON.stringify(candidate),
    };
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}
