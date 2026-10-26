// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizGame } from "@/components/QuizGame";
import { Pronunciation } from "@/components/Pronunciation";
import { HistoryPage } from "@/components/HistoryPage";
import { HomeworkResults } from "@/components/HomeworkResults";
import {
  publicQuiz,
  reviewMark,
  type StudyAttempt,
} from "@/lib/learning/types";
import { gradeQuiz } from "@/lib/learning/quiz";
import { segmentFrench } from "@/lib/french/segment";
import { quizPack, correctAnswers } from "./fixtures/quiz";
import { content } from "./fixtures/analysis";
import { passedReview, teacherTask } from "./fixtures/review";
let speak: ReturnType<typeof vi.fn>;
beforeEach(() => {
  speak = vi.fn();
  vi.stubGlobal("speechSynthesis", {
    getVoices: () => [{ name: "French", lang: "fr-CA" }],
    speak,
    cancel: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(public text: string) {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const id = "00000000-0000-4000-8000-000000000001",
  createdAt = "2026-10-25T15:00:00Z";
const quiz = publicQuiz({
  id,
  kind: "lesson",
  scopeKey: id,
  createdAt,
  revision: "1",
  pack: quizPack,
  attempts: [],
});
describe("review and redo UI", () => {
  it("plays quiz prompts, answers and feedback before and after marking, and preserves every redo", async () => {
    const user = userEvent.setup();
    const attempt = { id, createdAt, ...gradeQuiz(quizPack, correctAnswers) };
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, attempt }),
    });
    vi.stubGlobal("fetch", fetcher);
    render(
      <Pronunciation>
        <QuizGame quiz={quiz} />
      </Pronunciation>,
    );
    const spelling = within(screen.getByRole("group", { name: /Challenge 1/ }));
    await user.click(
      spelling.getByRole("button", { name: "Listen to the French word" }),
    );
    expect(speak.mock.calls.at(-1)![0].text).toBe("école");
    expect(screen.queryByText(/French.*: école/)).toBeNull();
    expect(screen.getByText(/Spelling word — listen carefully/)).toBeTruthy();
    expect(fetcher).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Your spelling"), {
      target: { value: "école" },
    });
    const radios = screen.getAllByRole("radio");
    await user.click(
      radios.find((r) => r.getAttribute("aria-label") === "Choose ball")!,
    );
    await user.click(
      radios.find((r) => r.getAttribute("aria-label") === "Choose est")!,
    );
    await user.click(
      radios.find((r) => r.getAttribute("aria-label") === "Choose rat")!,
    );
    await user.click(screen.getByRole("button", { name: "Mark my quiz" }));
    expect(
      await screen.findByRole("button", { name: "Redo this quiz" }),
    ).toBeTruthy();
    const answer = within(
      screen.getAllByRole("region", { name: "French answer to review" })[0],
    );
    const audio = answer.getByRole("button", { name: "Hear école" });
    expect((audio as HTMLButtonElement).disabled).toBe(false);
    await user.click(audio);
    expect(speak.mock.calls.at(-1)![0].text).toBe("école");
    expect(fetcher).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Redo this quiz" }));
    expect(screen.getByRole("button", { name: "Mark my quiz" })).toBeTruthy();
    expect(screen.getByText(/Quiz history · 1 try/)).toBeTruthy();
    expect(
      (screen.getByLabelText("Your spelling") as HTMLInputElement).value,
    ).toBe("");
    await user.click(screen.getByText("Quiz history · 1 try", { exact: true }));
    await user.click(screen.getByRole("button", { name: "Review this try" }));
    expect(screen.getByRole("button", { name: "Redo this quiz" })).toBeTruthy();
    expect(
      (screen.getByLabelText("Your spelling") as HTMLInputElement).value,
    ).toBe("école");
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("groups history by date and filters retrieval using date and month keys", async () => {
    const user = userEvent.setup(),
      fetcher = vi.fn().mockResolvedValue({
        json: async () => ({
          ok: true,
          months: ["2026-10"],
          timeZone: "America/Toronto",
          items: [
            {
              id,
              createdAt,
              dateKey: "2026-10-25",
              monthKey: "2026-10",
              title: teacherTask,
              hasImage: false,
              attemptCount: 2,
              latestMark: { earned: 2, total: 2, percent: 100 },
              bestMark: { earned: 2, total: 2, percent: 100 },
              status: "passed",
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetcher);
    render(<HistoryPage />);
    expect(
      await screen.findByRole("region", { name: "Learning on 2026-10-25" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Review & redo →" })
        .getAttribute("href"),
    ).toBe(`/history/${id}`);
    fireEvent.change(screen.getByLabelText("Find a date"), {
      target: { value: "2026-10-25" },
    });
    await screen.findByRole("region", { name: "Learning on 2026-10-25" });
    expect(fetcher.mock.calls.at(-1)![0]).toContain(
      "month=2026-10&date=2026-10-25",
    );
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
  });
  it("restores marked work, offers redo, and sends the saved lesson identity when rechecking", async () => {
    const user = userEvent.setup();
    const attempt: StudyAttempt = {
      id,
      lessonId: id,
      parentAttemptId: null,
      createdAt,
      kind: "homework",
      taskFrench: teacherTask,
      answer: "Mon ballon est rouge.",
      review: passedReview,
      mark: reviewMark(passedReview),
    };
    const fetcher = vi.fn().mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          url.startsWith("/api/history")
            ? { ok: true, quizzes: [] }
            : { ok: true, data: passedReview, attemptId: id },
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    render(
      <HomeworkResults
        analysis={{
          ...content,
          originalFrench: teacherTask,
          schemaVersion: "1",
          sourceType: "text",
          sentences: segmentFrench(teacherTask),
        }}
        lessonId={id}
        attempts={[attempt]}
        onCorrect={() => {}}
      />,
    );
    expect(
      (screen.getByLabelText("Your French answer") as HTMLTextAreaElement)
        .value,
    ).toBe(attempt.answer);
    await user.click(
      screen.getByRole("button", { name: "Redo teacher’s task" }),
    );
    expect(
      (screen.getByLabelText("Your French answer") as HTMLTextAreaElement)
        .value,
    ).toBe("");
    expect(
      screen.getByRole("region", { name: "Saved answer attempts" }),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Your French answer"), {
      target: { value: "Mon ballon est bleu." },
    });
    await user.click(screen.getByRole("button", { name: "Check my answer" }));
    await screen.findByRole("button", { name: "Redo teacher’s task" });
    const call = fetcher.mock.calls.find((c) => c[0] === "/api/review")!;
    expect(JSON.parse(call[1].body)).toMatchObject({
      lessonId: id,
      answer: "Mon ballon est bleu.",
    });
  });
});
