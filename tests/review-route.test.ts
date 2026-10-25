import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/review/route";
import { createProvider } from "@/server/llm/provider-factory";
import { passedReview, teacherTask } from "./fixtures/review";
vi.mock("@/server/llm/provider-factory", () => ({ createProvider: vi.fn() }));
afterEach(() => vi.resetAllMocks());
const request = (body: unknown, origin = "http://localhost") =>
  new Request("http://localhost/api/review", {
    method: "POST",
    headers: { "Content-Type": "application/json", host: "localhost", origin },
    body: JSON.stringify(body),
  });
describe("answer review API", () => {
  it("returns validated feedback with no caching", async () => {
    vi.mocked(createProvider).mockReturnValue({
      id: "gemini",
      model: "test",
      capabilities: { imageInput: true, structuredOutput: true },
      analyzeHomework: vi.fn(),
      reviewAnswer: vi.fn().mockResolvedValue(passedReview),
    });
    const response = await POST(
      request({ originalFrench: teacherTask, answer: "Trois phrases." }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).data.status).toBe("passed");
  });
  it("rejects invalid input and cross-site requests before provider calls", async () => {
    expect(
      (await POST(request({ originalFrench: teacherTask, answer: " " })))
        .status,
    ).toBe(400);
    expect((await POST(request({}, "https://other.example"))).status).toBe(403);
    expect(createProvider).not.toHaveBeenCalled();
  });
  it("rejects oversized answer bodies", async () => {
    expect(
      (
        await POST(
          request({ originalFrench: teacherTask, answer: "x".repeat(250001) }),
        )
      ).status,
    ).toBe(413);
  });
});
