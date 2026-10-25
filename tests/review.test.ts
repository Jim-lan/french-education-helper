import { describe, expect, it, vi } from "vitest";
import { AnswerReviewSchema, ReviewRequestSchema } from "@/lib/homework/review";
import { reviewAnswer } from "@/server/homework/review";
import { GeminiProvider } from "@/server/llm/providers/gemini";
import { passedReview, needsWorkReview, teacherTask } from "./fixtures/review";
import type { LLMProvider } from "@/server/llm/types";
describe("homework answer review", () => {
  it("accepts legacy feedback and validates structured French samples", () => {
    const { frenchExamples: _examples, ...legacy } = passedReview;
    expect(AnswerReviewSchema.parse(legacy).frenchExamples).toEqual([]);
    expect(
      AnswerReviewSchema.safeParse({
        ...passedReview,
        frenchExamples: [{ french: "", english: "A sample" }],
      }).success,
    ).toBe(false);
    expect(
      AnswerReviewSchema.safeParse({
        ...passedReview,
        frenchExamples: [
          { french: "Le ballon est bleu.", english: "The ball is blue." },
        ],
      }).success,
    ).toBe(true);
  });
  it.each([
    passedReview,
    needsWorkReview,
    { ...passedReview, status: "needs_parent_review", requirements: [] },
  ])("accepts coherent review state %#", (value) => {
    expect(AnswerReviewSchema.safeParse(value).success).toBe(true);
  });
  it.each([
    { ...passedReview, requirements: needsWorkReview.requirements },
    { ...passedReview, requirements: [] },
    { ...needsWorkReview, practice: null },
  ])("rejects contradictory pass/fail feedback %#", (value) => {
    expect(AnswerReviewSchema.safeParse(value).success).toBe(false);
  });
  it.each([
    { originalFrench: teacherTask, answer: " " },
    { originalFrench: teacherTask, answer: "x".repeat(10001) },
    { originalFrench: "", answer: "Bonjour." },
  ])("rejects missing/oversized input %#", (input) => {
    expect(ReviewRequestSchema.safeParse(input).success).toBe(false);
  });
  it("uses the selected provider and validates its feedback", async () => {
    const provider: LLMProvider = {
      id: "openai",
      model: "test-only",
      capabilities: { imageInput: true, structuredOutput: true },
      analyzeHomework: vi.fn(),
      reviewAnswer: vi.fn().mockResolvedValue(needsWorkReview),
    };
    const signal = new AbortController().signal;
    const input = { originalFrench: teacherTask, answer: "J’aime mon ballon." };
    expect(await reviewAnswer(input, provider, signal)).toEqual(
      needsWorkReview,
    );
    expect(provider.reviewAnswer).toHaveBeenCalledWith(input, { signal });
    vi.mocked(provider.reviewAnswer!).mockResolvedValue({
      ...passedReview,
      requirements: needsWorkReview.requirements,
    });
    await expect(reviewAnswer(input, provider, signal)).rejects.toMatchObject({
      code: "INVALID_AI_RESPONSE",
    });
    delete provider.reviewAnswer;
    await expect(reviewAnswer(input, provider, signal)).rejects.toMatchObject({
      code: "UNSUPPORTED_OPERATION",
    });
  });
  it("keeps review transport/schema/prompt inside the Gemini adapter", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: JSON.stringify(needsWorkReview) }] },
          },
        ],
      }),
    );
    const provider = new GeminiProvider("test", "synthetic-key", fetcher);
    const result = await provider.reviewAnswer(
      { originalFrench: teacherTask, answer: "J’aime mon ballon." },
      { signal: new AbortController().signal },
    );
    expect(result.status).toBe("needs_work");
    const body = JSON.parse(fetcher.mock.calls[0][1]?.body as string);
    expect(
      body.generationConfig.responseJsonSchema.properties.status,
    ).toBeDefined();
    expect(body.systemInstruction.parts[0].text).toContain(
      "untrusted source data",
    );
    expect(JSON.parse(body.contents[0].parts[0].text).originalFrench).toBe(
      teacherTask,
    );
  });
});
