import { LocalProvider } from "./local.provider";
import { MockAIProvider } from "./mock.provider";
import { OpenAIProvider } from "./openai.provider";
import type { AIProvider } from "./types";

export * from "./types";
export * from "./mock.provider";
export * from "./openai.provider";
export * from "./local.provider";

export type AIProviderName = "mock" | "openai" | "local";

export interface AIProviderFactoryConfig {
  provider: AIProviderName;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

/**
 * Single place that decides which AIProvider implementation is active.
 * Business logic (matcher, cover-letter writer, fact checker, etc.) must
 * depend only on the `AIProvider` interface, never on a concrete class,
 * so swapping providers never requires touching those modules.
 */
export function createAIProvider(config: AIProviderFactoryConfig): AIProvider {
  switch (config.provider) {
    case "mock":
      return new MockAIProvider();
    case "openai":
      return new OpenAIProvider({ apiKey: config.apiKey ?? "", model: config.model ?? "" });
    case "local":
      return new LocalProvider({ baseUrl: config.baseUrl ?? "", model: config.model ?? "" });
    default: {
      const _exhaustive: never = config.provider;
      throw new Error(`Unknown AI provider: ${_exhaustive}`);
    }
  }
}
