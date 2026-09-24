import type { z } from "zod";

/**
 * Provider-agnostic AI contract. Every real usage in later phases (resume
 * parsing, job matching, cover-letter generation, fact checking, question
 * answering) is built on top of this interface -- never against a
 * specific vendor SDK directly. See docs/architecture.md ("AI Provider
 * Abstraction") and Cursor rule #9.
 */

export interface AICompletionRequest {
  /** System / instruction prompt. Should be static per prompt version. */
  systemPrompt: string;
  /** User-specific content (job description, profile data, question, etc). */
  userPrompt: string;
  /** Identifies which prompt template produced this request (see section 62: Prompt Versioning). */
  promptVersion: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIStructuredRequest<T> extends AICompletionRequest {
  /**
   * Zod schema the response MUST validate against. The `any` input
   * parameter (rather than the default `Output`) is deliberate: schemas
   * using `.default(...)` on nested fields legitimately have a narrower
   * output type than input type, and callers only care that parsing
   * *produces* a `T`, not what raw shape was accepted.
   */
  schema: z.ZodType<T, z.ZodTypeDef, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface AIUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AITextResult {
  content: string;
  model: string;
  promptVersion: string;
  usage?: AIUsage;
}

export interface AIStructuredResult<T> {
  data: T;
  model: string;
  promptVersion: string;
  /** Raw text returned by the provider before schema parsing, kept for audit/debugging. */
  raw: string;
  usage?: AIUsage;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

/**
 * Thrown by providers that are defined (for architectural completeness)
 * but intentionally not implemented yet. This is NOT a fake
 * implementation -- it fails loudly instead of pretending to work.
 */
export class AIProviderNotImplementedError extends AIProviderError {
  constructor(provider: string, phase: string) {
    super(
      `AI provider "${provider}" is not implemented yet (planned for ${phase}). ` +
        `Set AI_PROVIDER=mock during development.`,
      provider,
    );
    this.name = "AIProviderNotImplementedError";
  }
}

export interface AIProvider {
  readonly name: string;

  generateText(request: AICompletionRequest): Promise<AITextResult>;

  generateStructured<T>(request: AIStructuredRequest<T>): Promise<AIStructuredResult<T>>;

  /** Cheap connectivity/credentials check, used by GET /api/health/ai. */
  isHealthy(): Promise<boolean>;
}
