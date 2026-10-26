import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { LearningStore } from "@/server/learning/store";
import { calendarKeys } from "@/server/learning/calendar";
import { HomeworkAnalysisSchema } from "@/lib/homework/schema";
import { segmentFrench } from "@/lib/french/segment";
import { reviewMark, publicQuiz } from "@/lib/learning/types";
import { content } from "./fixtures/analysis";
import { needsWorkReview, passedReview } from "./fixtures/review";
import { correctAnswers, quizPack } from "./fixtures/quiz";
const folders: string[] = [],
  stores: LearningStore[] = [];
const analysis = HomeworkAnalysisSchema.parse({
  ...content,
  schemaVersion: "1",
  sourceType: "text",
  sentences: segmentFrench(content.originalFrench),
});
function store(now = () => new Date("2026-10-25T15:00:00Z")) {
  const folder = mkdtempSync(path.join(os.tmpdir(), "french-history-test-"));
  folders.push(folder);
  const value = new LearningStore(path.join(folder, "learning.sqlite"), now);
  stores.push(value);
  return value;
}
afterEach(() => {
  for (const value of stores.splice(0))
    try {
      value.close();
    } catch {}
  for (const folder of folders.splice(0))
    rmSync(folder, { recursive: true, force: true });
});
describe("persistent household learning", () => {
  it("keeps original images and all attempts across reopening, grouped by household date", () => {
    let time = new Date("2026-10-01T02:00:00Z");
    const first = store(() => time);
    const imageAnalysis = { ...analysis, sourceType: "image" as const };
    const lesson = first.saveLesson(imageAnalysis, {
      kind: "image",
      mimeType: "image/png",
      bytes: new Uint8Array([1, 2, 3]),
    });
    expect(lesson.dateKey).toBe("2026-09-30");
    expect(lesson.monthKey).toBe("2026-09");
    const attempt = first.saveAttempt(lesson.id, "Le ballon.", needsWorkReview);
    first.saveAttempt(lesson.id, "Je joue.", passedReview, attempt.id);
    expect(first.getLesson(lesson.id).attempts.map((a) => a.kind)).toEqual([
      "homework",
      "practice",
    ]);
    expect(first.history("2026-09")[0]).toMatchObject({
      attemptCount: 1,
      status: "needs_work",
      latestMark: { earned: 0, total: 1, percent: 0 },
    });
    time = new Date("2026-10-02T15:00:00Z");
    first.saveAttempt(lesson.id, "Three correct sentences.", passedReview);
    const filename = first.filename;
    first.close();
    stores.splice(stores.indexOf(first), 1);
    const reopened = new LearningStore(filename);
    stores.push(reopened);
    expect(reopened.getLesson(lesson.id).attempts).toHaveLength(3);
    expect([...reopened.getImage(lesson.id).bytes]).toEqual([1, 2, 3]);
    expect(reopened.history("2026-09", "2026-09-30")[0]).toMatchObject({
      status: "passed",
      attemptCount: 2,
      bestMark: { percent: 100 },
    });
    expect(reopened.history("2026-10")).toEqual([]);
    expect(reopened.stats("2026-09")).toMatchObject({
      notes: 1,
      homeworkAttempts: 2,
      practiceAttempts: 1,
      completedNotes: 1,
      latestAverage: 100,
    });
  });
  it("rejects unrelated notes and cross-lesson practice references", () => {
    const value = store();
    expect(() =>
      value.saveLesson(
        {
          ...analysis,
          isFrenchStudy: false,
          relevanceExplanation: "This is a shopping receipt.",
        },
        { kind: "text", text: "receipt" },
      ),
    ).toThrow("shopping receipt");
    expect(value.history()).toHaveLength(0);
    const a = value.saveLesson(analysis, {
        kind: "text",
        text: analysis.originalFrench,
      }),
      b = value.saveLesson(analysis, {
        kind: "text",
        text: analysis.originalFrench,
      });
    const attempt = value.saveAttempt(a.id, "test", needsWorkReview);
    expect(() => value.getTask(b.id, attempt.id)).toThrow(
      "saved practice task",
    );
    expect(value.getTask(a.id, attempt.id).task).toBe(
      needsWorkReview.practice!.instructionFrench,
    );
  });
  it("does not invent marks for tasks needing parent review", () => {
    expect(
      reviewMark({ ...passedReview, status: "needs_parent_review" }),
    ).toBeNull();
    expect(reviewMark(passedReview)).toEqual({
      earned: 1,
      total: 1,
      percent: 100,
    });
  });
  it("saves quiz versions and all redos, grades on the server, and keeps answer keys out of new quiz payloads", () => {
    const value = store(),
      lesson = value.saveLesson(analysis, {
        kind: "text",
        text: analysis.originalFrench,
      });
    const old = value.saveQuiz("monthly", "2026-10", "revision1", quizPack);
    expect(value.saveQuiz("monthly", "2026-10", "revision1", quizPack).id).toBe(
      old.id,
    );
    expect(publicQuiz(old).pack.questions[0]).not.toHaveProperty("answer");
    const answers = correctAnswers.map((a) => ({ ...a }));
    answers[0].answer = "ecole";
    expect(value.grade(old.id, answers).mark).toEqual({
      earned: 3,
      total: 4,
      percent: 75,
    });
    expect(value.grade(old.id, correctAnswers).mark.percent).toBe(100);
    const newer = value.saveQuiz("monthly", "2026-10", "revision2", quizPack);
    expect(value.latestQuiz("monthly", "2026-10")!.id).toBe(newer.id);
    expect(value.getQuiz(old.id).attempts).toHaveLength(2);
    expect(value.quizVersions("monthly", "2026-10")).toHaveLength(2);
    expect(() =>
      value.grade(old.id, [
        correctAnswers[0],
        correctAnswers[0],
        ...correctAnswers.slice(2),
      ]),
    ).toThrow("every quiz question");
    const before = value.revision([value.getLesson(lesson.id)]);
    value.saveAttempt(lesson.id, "attempt", passedReview);
    expect(value.revision([value.getLesson(lesson.id)])).not.toBe(before);
  });
  it("uses calendar boundaries and daylight-saving time without UTC date drift", () => {
    expect(calendarKeys(new Date("2026-11-01T03:59:59Z"))).toEqual({
      dateKey: "2026-10-31",
      monthKey: "2026-10",
    });
    expect(calendarKeys(new Date("2026-11-01T04:00:00Z"))).toEqual({
      dateKey: "2026-11-01",
      monthKey: "2026-11",
    });
    expect(calendarKeys(new Date("2027-01-01T04:00:00Z"))).toEqual({
      dateKey: "2026-12-31",
      monthKey: "2026-12",
    });
  });
});
