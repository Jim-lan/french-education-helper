import { describe, expect, it, vi } from "vitest";
import { QuizPackSchema, gradeQuiz } from "@/lib/learning/quiz";
import { HomeworkAnalysisSchema } from "@/lib/homework/schema";
import { segmentFrench } from "@/lib/french/segment";
import { LearningStore } from "@/server/learning/store";
import { prepareQuiz } from "@/server/learning/quiz-service";
import { catchUpMonthly } from "@/server/learning/scheduler";
import type { LLMProvider } from "@/server/llm/types";
import { content } from "./fixtures/analysis";
import { passedReview } from "./fixtures/review";
import { quizPack, correctAnswers } from "./fixtures/quiz";
const analysis = HomeworkAnalysisSchema.parse({
  ...content,
  schemaVersion: "1",
  sourceType: "text",
  sentences: segmentFrench(content.originalFrench),
});
const signal = new AbortController().signal;
function provider() {
  return {
    id: "openai",
    model: "test",
    capabilities: { imageInput: true, structuredOutput: true },
    analyzeHomework: vi.fn(),
    generateQuiz: vi.fn().mockResolvedValue(quizPack),
  } satisfies LLMProvider;
}
describe("structured learning quizzes and monthly catch-up", () => {
  it("enforces a real answer key and French spelling accents", () => {
    expect(QuizPackSchema.safeParse(quizPack).success).toBe(true);
    expect(
      QuizPackSchema.safeParse({
        ...quizPack,
        questions: [
          quizPack.questions[0],
          ...quizPack.questions
            .slice(1)
            .map((q) => ({ ...q, answer: "missing" })),
        ],
      }).success,
    ).toBe(false);
    const answers = correctAnswers.map((a) => ({ ...a }));
    answers[0].answer = "  ÉCOLE  ";
    expect(gradeQuiz(quizPack, answers).mark.percent).toBe(100);
    answers[0].answer = "ecole";
    expect(gradeQuiz(quizPack, answers).mark.percent).toBe(75);
  });
  it("gates lesson games on an original-task pass, deduplicates generation, and reopens without a provider", async () => {
    const store = new LearningStore(":memory:");
    try {
      const lesson = store.saveLesson(analysis, {
          kind: "text",
          text: analysis.originalFrench,
        }),
        llm = provider(),
        factory = vi.fn(() => llm);
      await expect(
        prepareQuiz(
          store,
          { kind: "lesson", lessonId: lesson.id },
          factory,
          signal,
        ),
      ).rejects.toMatchObject({ code: "TASK_NOT_COMPLETE" });
      expect(factory).not.toHaveBeenCalled();
      store.saveAttempt(lesson.id, "complete", passedReview);
      const [a, b] = await Promise.all([
        prepareQuiz(
          store,
          { kind: "lesson", lessonId: lesson.id },
          factory,
          signal,
        ),
        prepareQuiz(
          store,
          { kind: "lesson", lessonId: lesson.id },
          factory,
          signal,
        ),
      ]);
      expect(a.id).toBe(b.id);
      expect(llm.generateQuiz).toHaveBeenCalledOnce();
      const forbidden = () => {
        throw new Error("must not call AI");
      };
      expect(
        (
          await prepareQuiz(
            store,
            { kind: "lesson", lessonId: lesson.id },
            forbidden,
            signal,
          )
        ).id,
      ).toBe(a.id);
    } finally {
      store.close();
    }
  });
  it("catches up completed months once, skips current months and empty history, and keeps summaries grounded", async () => {
    let now = new Date("2026-08-10T15:00:00Z");
    const store = new LearningStore(":memory:", () => now),
      llm = provider();
    try {
      store.saveLesson(analysis, {
        kind: "text",
        text: analysis.originalFrench,
      });
      now = new Date("2026-09-10T15:00:00Z");
      store.saveLesson(analysis, {
        kind: "text",
        text: analysis.originalFrench,
      });
      now = new Date("2026-10-25T15:00:00Z");
      store.saveLesson(analysis, {
        kind: "text",
        text: analysis.originalFrench,
      });
      await catchUpMonthly(store, () => llm, now);
      await catchUpMonthly(store, () => llm, now);
      expect(llm.generateQuiz).toHaveBeenCalledTimes(2);
      expect(store.latestQuiz("monthly", "2026-08")).not.toBeNull();
      expect(store.latestQuiz("monthly", "2026-10")).toBeNull();
      expect(llm.generateQuiz.mock.calls[0][0]).toMatchObject({
        kind: "monthly",
        period: "2026-08",
        progress: { notes: 1, completed: 0, attempts: 0 },
      });
      await expect(
        prepareQuiz(
          store,
          { kind: "monthly", month: "2026-07" },
          () => llm,
          signal,
        ),
      ).rejects.toMatchObject({ code: "NO_LEARNING_RECORDS" });
    } finally {
      store.close();
    }
  });
  it("backs off failed monthly generation, permits retry later, and never saves malformed quizzes", async () => {
    let now = new Date("2026-08-10T15:00:00Z");
    const store = new LearningStore(":memory:", () => now),
      llm = provider();
    try {
      store.saveLesson(analysis, {
        kind: "text",
        text: analysis.originalFrench,
      });
      now = new Date("2026-10-25T15:00:00Z");
      llm.generateQuiz.mockResolvedValueOnce({} as never);
      await catchUpMonthly(store, () => llm, now);
      expect(store.latestQuiz("monthly", "2026-08")).toBeNull();
      expect(store.jobStatus("2026-08")?.error).toContain("completely");
      await catchUpMonthly(store, () => llm, now);
      expect(llm.generateQuiz).toHaveBeenCalledOnce();
      now = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      await catchUpMonthly(store, () => llm, now);
      expect(store.latestQuiz("monthly", "2026-08")).not.toBeNull();
    } finally {
      store.close();
    }
  });
});
