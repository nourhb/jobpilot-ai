import { describe, expect, it } from "vitest";
import { z } from "zod";
import { MockAIProvider } from "./mock.provider";

describe("MockAIProvider", () => {
  it("returns a deterministic canned response when nothing is queued", async () => {
    const provider = new MockAIProvider();

    const result = await provider.generateText({
      systemPrompt: "system",
      userPrompt: "hello world",
      promptVersion: "test-v1",
    });

    expect(result.model).toBe("mock-1");
    expect(result.promptVersion).toBe("test-v1");
    expect(result.content).toContain("hello world");
  });

  it("returns a queued text response first", async () => {
    const provider = new MockAIProvider();
    provider.queueTextResponse("canned response");

    const result = await provider.generateText({
      systemPrompt: "system",
      userPrompt: "hello world",
      promptVersion: "test-v1",
    });

    expect(result.content).toBe("canned response");
  });

  it("validates structured output against the provided schema", async () => {
    const provider = new MockAIProvider();
    const schema = z.object({ score: z.number().min(0).max(100) });

    provider.queueStructuredResponse({ score: 87 });

    const result = await provider.generateStructured({
      systemPrompt: "system",
      userPrompt: "match this job",
      promptVersion: "matcher-v1",
      schema,
    });

    expect(result.data.score).toBe(87);
  });

  it("throws when the queued structured response fails schema validation", async () => {
    const provider = new MockAIProvider();
    const schema = z.object({ score: z.number().min(0).max(100) });

    provider.queueStructuredResponse({ score: "not-a-number" });

    await expect(
      provider.generateStructured({
        systemPrompt: "system",
        userPrompt: "match this job",
        promptVersion: "matcher-v1",
        schema,
      }),
    ).rejects.toThrow();
  });

  it("reports healthy", async () => {
    const provider = new MockAIProvider();
    await expect(provider.isHealthy()).resolves.toBe(true);
  });
});
