import "server-only";
import { QuizPackSchema, type LearningContext } from "@/lib/learning/quiz";
import type { LLMProvider } from "@/server/llm/types";
import { AppError, safeError } from "@/server/errors";
import { calendarKeys } from "./calendar";
import { type LearningStore } from "./store";

const inFlight = new Map<
  string,
  Promise<ReturnType<LearningStore["getQuiz"]>>
>();
export async function prepareQuiz(
  store: LearningStore,
  input:
    { kind: "lesson"; lessonId: string } | { kind: "monthly"; month: string },
  provider: () => LLMProvider,
  signal: AbortSignal,
) {
  const scope = input.kind === "lesson" ? input.lessonId : input.month;
  const lessons =
    input.kind === "lesson"
      ? [store.getLesson(scope)]
      : store.monthLessons(scope);
  if (!lessons.length)
    throw new AppError(
      "NO_LEARNING_RECORDS",
      "Save a French note in this month before creating a review.",
    );
  if (input.kind === "monthly" && scope > calendarKeys().monthKey)
    throw new AppError(
      "INVALID_INPUT",
      "Choose the current month or an earlier learning month.",
    );
  if (
    input.kind === "lesson" &&
    !lessons[0].attempts.some(
      (a) => a.kind === "homework" && a.review.status === "passed",
    )
  )
    throw new AppError(
      "TASK_NOT_COMPLETE",
      "Finish the teacher's basic task before starting the learning game.",
      409,
    );
  const revision = store.revision(lessons);
  const existing = store
    .quizVersions(input.kind, scope)
    .find((q) => q.revision === revision);
  if (existing) return existing;
  const key = `${input.kind}:${scope}`;
  if (inFlight.has(key)) return inFlight.get(key)!;
  const work = (async () => {
    if (input.kind === "monthly" && !store.claimMonth(scope))
      throw new AppError(
        "REVIEW_PENDING",
        "This monthly review is being prepared, or a recent preparation failed. Check its status and retry later.",
        409,
      );
    try {
      const llm = provider();
      if (!llm.generateQuiz)
        throw new AppError(
          "UNSUPPORTED_OPERATION",
          "This provider cannot create learning quizzes yet.",
          503,
        );
      const context: LearningContext = {
        kind: input.kind,
        period: scope,
        progress: {
          notes: lessons.length,
          completed: lessons.filter((l) =>
            l.attempts.some(
              (a) => a.kind === "homework" && a.review.status === "passed",
            ),
          ).length,
          attempts: lessons.reduce((n, l) => n + l.attempts.length, 0),
        },
        notes: lessons.slice(0, 30).map((l) => ({
          french: l.analysis.originalFrench.slice(0, 2000),
          meanings: l.analysis.wordMeanings.slice(0, 30),
          feedback: l.attempts
            .slice(-3)
            .flatMap((a) => [a.review.summaryEnglish, ...a.review.improvements])
            .slice(0, 8)
            .map((text) => text.slice(0, 500)),
        })),
      };
      const parsed = QuizPackSchema.safeParse(
        await llm.generateQuiz(context, { signal }),
      );
      if (!parsed.success)
        throw new AppError(
          "INVALID_AI_RESPONSE",
          "The quiz could not be prepared completely. Please try again.",
          502,
        );
      const saved = store.saveQuiz(input.kind, scope, revision, parsed.data);
      if (input.kind === "monthly") store.finishMonth(scope);
      return saved;
    } catch (error) {
      if (input.kind === "monthly")
        store.finishMonth(scope, safeError(error).message);
      throw error;
    }
  })();
  inFlight.set(key, work);
  try {
    return await work;
  } finally {
    inFlight.delete(key);
  }
}
