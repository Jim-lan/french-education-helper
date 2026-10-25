import { describe, expect, it, vi } from "vitest";
import { GeminiProvider } from "@/server/llm/providers/gemini";
import { content } from "./fixtures/analysis";
const input = { kind: "text" as const, text: content.originalFrench };
const signal = new AbortController().signal;
function envelope(text = JSON.stringify(content), finishReason = "STOP") {
  return Response.json({
    candidates: [{ finishReason, content: { parts: [{ text }] } }],
  });
}
describe("Gemini adapter (mocked HTTP only)", () => {
  it("sends schema and key server-side and normalizes JSON", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(envelope());
    const provider = new GeminiProvider("test-model", "synthetic-key", fetcher);
    expect(await provider.analyzeHomework(input, { signal })).toEqual(content);
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).not.toContain("synthetic-key");
    expect(init?.headers).toMatchObject({ "x-goog-api-key": "synthetic-key" });
    const body = JSON.parse(init?.body as string);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(
      body.generationConfig.responseJsonSchema.properties.originalFrench,
    ).toBeDefined();
    expect(body.generationConfig.responseJsonSchema.properties.wordMeanings).toBeDefined();
    expect(body.contents[0].parts[0].text).toContain('"Lis","le","texte"');
    expect(init?.signal).toBe(signal);
  });
  it("encodes image bytes inside the adapter", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(envelope());
    await new GeminiProvider("test", "key", fetcher).analyzeHomework(
      {
        kind: "image",
        bytes: new Uint8Array([1, 2, 3]),
        mimeType: "image/png",
      },
      { signal },
    );
    expect(
      JSON.parse(fetcher.mock.calls[0][1]?.body as string).contents[0].parts[1]
        .inlineData,
    ).toEqual({ data: "AQID", mimeType: "image/png" });
  });
  it.each([401, 403, 429, 500, 404])(
    "handles upstream HTTP %s without leaking raw errors",
    async (status) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("PRIVATE PROVIDER ERROR", { status }));
      await expect(
        new GeminiProvider("test", "key", fetcher).analyzeHomework(input, {
          signal,
        }),
      ).rejects.not.toThrow("PRIVATE PROVIDER ERROR");
    },
  );
  it.each([
    () => envelope("not JSON"),
    () => envelope(JSON.stringify({})),
    () => envelope(undefined, "MAX_TOKENS"),
    () => Response.json({ promptFeedback: { blockReason: "SAFETY" } }),
  ])("rejects invalid/incomplete/refused response %#", async (response) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response());
    await expect(
      new GeminiProvider("test", "key", fetcher).analyzeHomework(input, {
        signal,
      }),
    ).rejects.toMatchObject({ code: "INVALID_AI_RESPONSE" });
  });
  it("reports unreadable French", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        envelope(JSON.stringify({ ...content, originalFrench: "" })),
      );
    await expect(
      new GeminiProvider("test", "key", fetcher).analyzeHomework(input, {
        signal,
      }),
    ).rejects.toMatchObject({ code: "UNREADABLE_INPUT" });
  });
});
