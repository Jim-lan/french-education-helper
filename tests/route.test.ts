import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/analyze/route";
import { createProvider } from "@/server/llm/provider-factory";
import { AppError } from "@/server/errors";
import { content } from "./fixtures/analysis";
vi.mock("@/server/llm/provider-factory", () => ({ createProvider: vi.fn() }));
afterEach(() => vi.resetAllMocks());
function request(origin = "http://localhost") {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    body: JSON.stringify({ text: "  Lis le texte deux fois. " }),
    headers: { host: "localhost", origin, "Content-Type": "application/json" },
  });
}
describe("analysis HTTP boundary", () => {
  it("returns validated JSON with no caching through a test provider", async () => {
    vi.mocked(createProvider).mockReturnValue({
      id: "gemini",
      model: "test",
      capabilities: { imageInput: true, structuredOutput: true },
      analyzeHomework: vi.fn().mockResolvedValue(content),
    });
    const response = await POST(request());
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(result.data.originalFrench).toBe("  Lis le texte deux fois. ");
  });
  it("returns actionable missing-config error", async () => {
    vi.mocked(createProvider).mockImplementation(() => {
      throw new AppError(
        "PROVIDER_NOT_CONFIGURED",
        "Gemini is not configured.",
        503,
      );
    });
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("PROVIDER_NOT_CONFIGURED");
  });
  it("rejects a cross-site request before creating a provider", async () => {
    expect((await POST(request("https://other.example"))).status).toBe(403);
    expect(createProvider).not.toHaveBeenCalled();
  });
  it("hides unexpected errors and maps timeout errors", async () => {
    for (const error of [
      new Error("private secret trace"),
      new DOMException("timeout", "TimeoutError"),
    ]) {
      vi.mocked(createProvider).mockImplementation(() => {
        throw error;
      });
      const response = await POST(request());
      expect([502, 504]).toContain(response.status);
      expect(JSON.stringify(await response.json())).not.toContain(
        "private secret trace",
      );
    }
  });
});
