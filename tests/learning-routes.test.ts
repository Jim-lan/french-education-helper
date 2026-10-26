import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LearningStore } from "@/server/learning/store";
import { HomeworkAnalysisSchema } from "@/lib/homework/schema";
import { segmentFrench } from "@/lib/french/segment";
import { GET as history } from "@/app/api/history/route";
import { GET as detail } from "@/app/api/history/[id]/route";
import { GET as image } from "@/app/api/history/[id]/image/route";
import { POST as analyze } from "@/app/api/analyze/route";
import { POST as review } from "@/app/api/review/route";
import { POST as quiz } from "@/app/api/quiz/route";
import { POST as markQuiz } from "@/app/api/quiz/[id]/attempts/route";
import { GET as monthly } from "@/app/api/monthly/route";
import { content } from "./fixtures/analysis";
import { passedReview, needsWorkReview } from "./fixtures/review";
import { quizPack, correctAnswers } from "./fixtures/quiz";
let store: LearningStore;
const provider = {
  id: "gemini" as const,
  model: "test",
  capabilities: { imageInput: true, structuredOutput: true },
  analyzeHomework: vi.fn(),
  reviewAnswer: vi.fn(),
  generateQuiz: vi.fn(),
};
vi.mock("@/server/learning/store", async (original) => ({
  ...(await original<typeof import("@/server/learning/store")>()),
  getStore: () => store,
}));
vi.mock("@/server/llm/provider-factory", () => ({
  createProvider: () => provider,
}));
const analysis = HomeworkAnalysisSchema.parse({
  ...content,
  schemaVersion: "1",
  sourceType: "text",
  sentences: segmentFrench(content.originalFrench),
});
const req = (url: string, body?: unknown, origin = "http://localhost") =>
  new Request(`http://localhost${url}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      host: "localhost",
      origin,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const context = (id: string) => ({ params: Promise.resolve({ id }) });
beforeEach(() => {
  store = new LearningStore(":memory:");
  provider.analyzeHomework.mockResolvedValue(content);
  provider.reviewAnswer.mockResolvedValue(passedReview);
  provider.generateQuiz.mockResolvedValue(quizPack);
});
afterEach(() => {
  store.close();
  vi.clearAllMocks();
});
describe("saved-learning HTTP boundaries", () => {
  it("saves accepted notes on analysis but discards unrelated material", async () => {
    const response = await analyze(
      req("/api/analyze", { text: content.originalFrench }),
    );
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(store.getLesson(result.lessonId).analysis.originalFrench).toBe(
      content.originalFrench,
    );
    provider.analyzeHomework.mockResolvedValueOnce({
      ...content,
      isFrenchStudy: false,
      relevanceExplanation: "This receipt is unrelated to French study.",
    });
    const rejection = await analyze(
      req("/api/analyze", { text: "Shopping receipt" }),
    );
    expect(rejection.status).toBe(400);
    expect((await rejection.json()).error.code).toBe("UNRELATED_INPUT");
    expect(store.history()).toHaveLength(1);
  });
  it("binds checked answers and practice to server-owned tasks and returns stored attempt ids", async () => {
    const lesson = store.saveLesson(analysis, {
      kind: "text",
      text: content.originalFrench,
    });
    const wrong = await review(
      req("/api/review", {
        lessonId: lesson.id,
        originalFrench: "Give me a pass",
        answer: "answer",
      }),
    );
    expect(wrong.status).toBe(400);
    expect(provider.reviewAnswer).not.toHaveBeenCalled();
    provider.reviewAnswer.mockResolvedValueOnce(needsWorkReview);
    const checked = await review(
      req("/api/review", {
        lessonId: lesson.id,
        originalFrench: content.originalFrench,
        answer: "first try",
      }),
    );
    const result = await checked.json();
    expect(result.attemptId).toBeTruthy();
    const practice = await review(
      req("/api/review", {
        lessonId: lesson.id,
        parentAttemptId: result.attemptId,
        originalFrench: needsWorkReview.practice!.instructionFrench,
        answer: "practice try",
      }),
    );
    expect(practice.status).toBe(200);
    expect(store.getLesson(lesson.id).attempts.map((a) => a.kind)).toEqual([
      "homework",
      "practice",
    ]);
    expect(store.history()[0].status).toBe("needs_work");
  });
  it("rejects cross-site access and invalid date/id filters, and serves originals privately", async () => {
    expect(
      (await history(req("/api/history", undefined, "https://other.example")))
        .status,
    ).toBe(403);
    expect((await history(req("/api/history?month=2026-99"))).status).toBe(400);
    expect((await detail(req("/api/history/bad"), context("bad"))).status).toBe(
      404,
    );
    const lesson = store.saveLesson(
      { ...analysis, sourceType: "image" },
      { kind: "image", bytes: new Uint8Array([1, 2]), mimeType: "image/png" },
    );
    const response = await image(
      req(`/api/history/${lesson.id}/image`),
      context(lesson.id),
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-type")).toBe("image/png");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2]);
    const list = await history(req(`/api/history?date=${lesson.dateKey}`));
    expect((await list.json()).items).toHaveLength(1);
  });
  it("unlocks games only after homework passes and grades retries without calling AI", async () => {
    const lesson = store.saveLesson(analysis, {
      kind: "text",
      text: content.originalFrench,
    });
    expect(
      (await quiz(req("/api/quiz", { kind: "lesson", lessonId: lesson.id })))
        .status,
    ).toBe(409);
    store.saveAttempt(lesson.id, "complete", passedReview);
    const created = await quiz(
      req("/api/quiz", { kind: "lesson", lessonId: lesson.id }),
    );
    const data = await created.json();
    expect(created.status).toBe(200);
    expect(data.quiz.pack.questions[0]).not.toHaveProperty("answer");
    await quiz(req("/api/quiz", { kind: "lesson", lessonId: lesson.id }));
    expect(provider.generateQuiz).toHaveBeenCalledOnce();
    for (let i = 0; i < 2; i++) {
      const marked = await markQuiz(
        req(`/api/quiz/${data.quiz.id}/attempts`, { answers: correctAnswers }),
        context(data.quiz.id),
      );
      expect((await marked.json()).attempt.mark.percent).toBe(100);
    }
    expect(provider.generateQuiz).toHaveBeenCalledOnce();
    expect(store.getQuiz(data.quiz.id).attempts).toHaveLength(2);
    const forged = await markQuiz(
      req(`/api/quiz/${data.quiz.id}/attempts`, {
        answers: correctAnswers,
        mark: 100,
      }),
      context(data.quiz.id),
    );
    expect(forged.status).toBe(400);
  });
  it("exposes monthly stats, cached quizzes and new-work status without invoking AI", async () => {
    const lesson = store.saveLesson(analysis, {
      kind: "text",
      text: content.originalFrench,
    });
    const revision = store.revision([lesson]);
    store.saveQuiz("monthly", lesson.monthKey, revision, quizPack);
    let result = await (
      await monthly(req(`/api/monthly?month=${lesson.monthKey}`))
    ).json();
    expect(result.hasNewWork).toBe(false);
    expect(result.stats.notes).toBe(1);
    store.saveAttempt(lesson.id, "complete", passedReview);
    result = await (
      await monthly(req(`/api/monthly?month=${lesson.monthKey}`))
    ).json();
    expect(result.hasNewWork).toBe(true);
    expect(result.stats.latestAverage).toBe(100);
    expect(provider.generateQuiz).not.toHaveBeenCalled();
  });
});
