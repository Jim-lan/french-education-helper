import { describe, expect, it, vi } from "vitest";
import { analyzeHomework } from "@/server/homework/analyze";
import type { LLMProvider } from "@/server/llm/types";
import { content } from "./fixtures/analysis";
describe("provider-independent homework service", () => {
  const signal = new AbortController().signal;
  function stub(): LLMProvider {
    return {
      id: "openai",
      model: "test-only",
      capabilities: { imageInput: true, structuredOutput: true },
      analyzeHomework: vi.fn().mockResolvedValue(content),
    };
  }
  it("replaces model-rewritten text with exact source; does not depend on Gemini", async () => {
    const provider = stub();
    const text = "  Lis le texte deux fois.\nSouligne les verbes. ";
    const result = await analyzeHomework(
      { kind: "text", text },
      provider,
      signal,
    );
    expect(result.originalFrench).toBe(text);
    expect(result.sourceType).toBe("text");
    expect(provider.analyzeHomework).toHaveBeenCalledWith(
      { kind: "text", text },
      { signal },
    );
  });
  it("normalizes an image through the same result schema", async () => {
    const result = await analyzeHomework(
      { kind: "image", bytes: new Uint8Array(), mimeType: "image/png" },
      stub(),
      signal,
    );
    expect(result.sourceType).toBe("image");
    expect(result.sentences).toHaveLength(2);
  });
  it("rejects an adapter with malformed output", async () => {
    const provider = stub();
    vi.mocked(provider.analyzeHomework).mockResolvedValue({} as never);
    await expect(
      analyzeHomework({ kind: "text", text: "Lis." }, provider, signal),
    ).rejects.toMatchObject({ code: "INVALID_AI_RESPONSE" });
  });
});
