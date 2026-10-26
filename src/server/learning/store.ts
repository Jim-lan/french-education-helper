import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import {
  HomeworkAnalysisSchema,
  type HomeworkAnalysis,
} from "@/lib/homework/schema";
import { AnswerReviewSchema, type AnswerReview } from "@/lib/homework/review";
import { QuizPackSchema, gradeQuiz, type QuizPack } from "@/lib/learning/quiz";
import {
  reviewMark,
  type Lesson,
  type StudyAttempt,
  type HistoryItem,
  type SavedQuiz,
  type QuizAttempt,
  type MonthlyStats,
} from "@/lib/learning/types";
import type { HomeworkInput } from "@/server/llm/types";
import { AppError } from "@/server/errors";
import { calendarKeys } from "./calendar";

type Row = Record<string, string | number | null | Uint8Array>;
const lessonColumns =
  "id, created_at, date_key, month_key, analysis, image IS NOT NULL AS has_image";
export class LearningStore {
  readonly db: DatabaseSync;
  constructor(
    readonly filename: string,
    private readonly now: () => Date = () => new Date(),
  ) {
    if (filename !== ":memory:")
      mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(filename, { timeout: 5000 });
    if (filename !== ":memory:") chmodSync(filename, 0o600);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS lessons (
        id TEXT PRIMARY KEY, created_at TEXT NOT NULL, date_key TEXT NOT NULL,
        month_key TEXT NOT NULL, analysis TEXT NOT NULL, image BLOB, mime_type TEXT
      ) STRICT;
      CREATE INDEX IF NOT EXISTS lessons_date ON lessons(date_key, created_at);
      CREATE INDEX IF NOT EXISTS lessons_month ON lessons(month_key);
      CREATE TABLE IF NOT EXISTS attempts (
        id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL REFERENCES lessons(id),
        parent_id TEXT REFERENCES attempts(id), created_at TEXT NOT NULL,
        kind TEXT NOT NULL CHECK(kind IN ('homework','practice')),
        task TEXT NOT NULL, answer TEXT NOT NULL, review TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS attempts_lesson ON attempts(lesson_id, created_at);
      CREATE TABLE IF NOT EXISTS quizzes (
        id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('lesson','monthly')),
        scope_key TEXT NOT NULL, revision TEXT NOT NULL, created_at TEXT NOT NULL,
        pack TEXT NOT NULL, UNIQUE(kind,scope_key,revision)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id TEXT PRIMARY KEY, quiz_id TEXT NOT NULL REFERENCES quizzes(id),
        created_at TEXT NOT NULL, result TEXT NOT NULL
      ) STRICT;
      CREATE INDEX IF NOT EXISTS quiz_attempts_quiz ON quiz_attempts(quiz_id,created_at);
      CREATE TABLE IF NOT EXISTS monthly_jobs (
        month_key TEXT PRIMARY KEY, lease_until INTEGER NOT NULL, last_error TEXT
      ) STRICT;
      PRAGMA user_version=1;`);
  }
  close() {
    this.db.close();
  }
  saveLesson(analysis: HomeworkAnalysis, input: HomeworkInput): Lesson {
    if (!analysis.isFrenchStudy)
      throw new AppError("UNRELATED_INPUT", analysis.relevanceExplanation);
    HomeworkAnalysisSchema.parse(analysis);
    const id = randomUUID(),
      date = this.now(),
      createdAt = date.toISOString();
    const { dateKey, monthKey } = calendarKeys(date);
    this.db
      .prepare("INSERT INTO lessons VALUES(?,?,?,?,?,?,?)")
      .run(
        id,
        createdAt,
        dateKey,
        monthKey,
        JSON.stringify(analysis),
        input.kind === "image" ? input.bytes : null,
        input.kind === "image" ? input.mimeType : null,
      );
    return {
      id,
      createdAt,
      dateKey,
      monthKey,
      analysis,
      hasImage: input.kind === "image",
      attempts: [],
    };
  }
  getLesson(id: string): Lesson {
    const row = this.db
      .prepare(`SELECT ${lessonColumns} FROM lessons WHERE id=?`)
      .get(id) as Row | undefined;
    if (!row)
      throw new AppError(
        "NOT_FOUND",
        "That saved note could not be found.",
        404,
      );
    return {
      id: String(row.id),
      createdAt: String(row.created_at),
      dateKey: String(row.date_key),
      monthKey: String(row.month_key),
      analysis: HomeworkAnalysisSchema.parse(JSON.parse(String(row.analysis))),
      hasImage: Boolean(row.has_image),
      attempts: this.getAttempts(id),
    };
  }
  getImage(id: string) {
    const row = this.db
      .prepare("SELECT image,mime_type FROM lessons WHERE id=?")
      .get(id) as Row | undefined;
    if (!row?.image)
      throw new AppError("NOT_FOUND", "This note has no saved image.", 404);
    return { bytes: row.image as Uint8Array, mimeType: String(row.mime_type) };
  }
  getAttempts(lessonId: string): StudyAttempt[] {
    return (
      this.db
        .prepare(
          "SELECT * FROM attempts WHERE lesson_id=? ORDER BY created_at,rowid",
        )
        .all(lessonId) as Row[]
    ).map((row) => {
      const review = AnswerReviewSchema.parse(JSON.parse(String(row.review)));
      return {
        id: String(row.id),
        lessonId,
        parentAttemptId: row.parent_id ? String(row.parent_id) : null,
        createdAt: String(row.created_at),
        kind: row.kind as StudyAttempt["kind"],
        taskFrench: String(row.task),
        answer: String(row.answer),
        review,
        mark: reviewMark(review),
      };
    });
  }
  getTask(lessonId: string, parentAttemptId?: string) {
    const lesson = this.getLesson(lessonId);
    if (!parentAttemptId)
      return {
        lesson,
        task: lesson.analysis.originalFrench,
        kind: "homework" as const,
      };
    const parent = lesson.attempts.find((a) => a.id === parentAttemptId);
    if (!parent?.review.practice || parent.kind !== "homework")
      throw new AppError(
        "INVALID_INPUT",
        "Open a saved practice task before checking its answer.",
      );
    return {
      lesson,
      task: parent.review.practice.instructionFrench,
      kind: "practice" as const,
    };
  }
  saveAttempt(
    lessonId: string,
    answer: string,
    review: AnswerReview,
    parentAttemptId?: string,
  ): StudyAttempt {
    const { task, kind } = this.getTask(lessonId, parentAttemptId);
    AnswerReviewSchema.parse(review);
    const id = randomUUID(),
      createdAt = this.now().toISOString();
    this.db
      .prepare("INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?)")
      .run(
        id,
        lessonId,
        parentAttemptId || null,
        createdAt,
        kind,
        task,
        answer,
        JSON.stringify(review),
      );
    return {
      id,
      lessonId,
      parentAttemptId: parentAttemptId || null,
      createdAt,
      kind,
      taskFrench: task,
      answer,
      review,
      mark: reviewMark(review),
    };
  }
  months(): string[] {
    return (
      this.db
        .prepare(
          "SELECT DISTINCT month_key FROM lessons ORDER BY month_key DESC",
        )
        .all() as Row[]
    ).map((row) => String(row.month_key));
  }
  history(month?: string, date?: string): HistoryItem[] {
    const rows = this.db
      .prepare(
        `SELECT ${lessonColumns} FROM lessons WHERE (? IS NULL OR month_key=?) AND (? IS NULL OR date_key=?) ORDER BY created_at DESC,id DESC`,
      )
      .all(month || null, month || null, date || null, date || null) as Row[];
    return rows.map((row) => {
      const attempts = this.getAttempts(String(row.id)).filter(
        (a) => a.kind === "homework",
      );
      const latest = attempts.at(-1),
        marks = attempts
          .map((a) => a.mark)
          .filter((m): m is NonNullable<typeof m> => Boolean(m));
      return {
        id: String(row.id),
        createdAt: String(row.created_at),
        dateKey: String(row.date_key),
        monthKey: String(row.month_key),
        title: HomeworkAnalysisSchema.parse(
          JSON.parse(String(row.analysis)),
        ).originalFrench.slice(0, 160),
        hasImage: Boolean(row.has_image),
        attemptCount: attempts.length,
        latestMark: latest?.mark || null,
        bestMark: marks.sort((a, b) => b.percent - a.percent)[0] || null,
        status: latest?.review.status || "new",
      };
    });
  }
  monthLessons(month: string) {
    return this.history(month).map((item) => this.getLesson(item.id));
  }
  stats(month: string): MonthlyStats {
    const lessons = this.monthLessons(month),
      homework = lessons.flatMap((l) =>
        l.attempts.filter((a) => a.kind === "homework"),
      );
    const latestMarks = lessons
      .map((l) => l.attempts.filter((a) => a.kind === "homework").at(-1)?.mark)
      .filter((m): m is NonNullable<typeof m> => Boolean(m));
    return {
      month,
      notes: lessons.length,
      homeworkAttempts: homework.length,
      practiceAttempts: lessons.reduce(
        (n, l) => n + l.attempts.filter((a) => a.kind === "practice").length,
        0,
      ),
      completedNotes: lessons.filter((l) =>
        l.attempts.some(
          (a) => a.kind === "homework" && a.review.status === "passed",
        ),
      ).length,
      latestAverage: latestMarks.length
        ? Math.round(
            latestMarks.reduce((n, m) => n + m.percent, 0) / latestMarks.length,
          )
        : null,
      words: [
        ...new Set(
          lessons.flatMap((l) => l.analysis.wordMeanings.map((w) => w.french)),
        ),
      ].slice(0, 100),
    };
  }
  revision(lessons: Lesson[]) {
    return createHash("sha256")
      .update(
        JSON.stringify(
          lessons
            .map((l) => [l.id, ...l.attempts.map((a) => a.id)])
            .sort((a, b) => a[0].localeCompare(b[0])),
        ),
      )
      .digest("hex");
  }
  latestQuiz(kind: SavedQuiz["kind"], scope: string): SavedQuiz | null {
    const row = this.db
      .prepare(
        "SELECT id FROM quizzes WHERE kind=? AND scope_key=? ORDER BY created_at DESC,rowid DESC LIMIT 1",
      )
      .get(kind, scope) as Row | undefined;
    return row ? this.getQuiz(String(row.id)) : null;
  }
  saveQuiz(
    kind: SavedQuiz["kind"],
    scope: string,
    revision: string,
    pack: QuizPack,
  ): SavedQuiz {
    QuizPackSchema.parse(pack);
    const id = randomUUID();
    this.db
      .prepare("INSERT OR IGNORE INTO quizzes VALUES(?,?,?,?,?,?)")
      .run(
        id,
        kind,
        scope,
        revision,
        this.now().toISOString(),
        JSON.stringify(pack),
      );
    const row = this.db
      .prepare(
        "SELECT id FROM quizzes WHERE kind=? AND scope_key=? AND revision=?",
      )
      .get(kind, scope, revision) as Row;
    return this.getQuiz(String(row.id));
  }
  getQuiz(id: string): SavedQuiz {
    const row = this.db.prepare("SELECT * FROM quizzes WHERE id=?").get(id) as
      Row | undefined;
    if (!row)
      throw new AppError("NOT_FOUND", "That quiz could not be found.", 404);
    const attempts = (
      this.db
        .prepare(
          "SELECT * FROM quiz_attempts WHERE quiz_id=? ORDER BY created_at,rowid",
        )
        .all(id) as Row[]
    ).map(
      (a) =>
        ({
          id: String(a.id),
          createdAt: String(a.created_at),
          ...JSON.parse(String(a.result)),
        }) as QuizAttempt,
    );
    return {
      id,
      kind: row.kind as SavedQuiz["kind"],
      scopeKey: String(row.scope_key),
      revision: String(row.revision),
      createdAt: String(row.created_at),
      pack: QuizPackSchema.parse(JSON.parse(String(row.pack))),
      attempts,
    };
  }
  quizVersions(kind: SavedQuiz["kind"], scope: string) {
    return (
      this.db
        .prepare(
          "SELECT id FROM quizzes WHERE kind=? AND scope_key=? ORDER BY created_at DESC,rowid DESC",
        )
        .all(kind, scope) as Row[]
    ).map((r) => this.getQuiz(String(r.id)));
  }
  grade(
    id: string,
    answers: { questionId: string; answer: string }[],
  ): QuizAttempt {
    const quiz = this.getQuiz(id);
    let result: ReturnType<typeof gradeQuiz>;
    try {
      result = gradeQuiz(quiz.pack, answers);
    } catch {
      throw new AppError(
        "INVALID_INPUT",
        "Answer every quiz question once before checking.",
      );
    }
    const attempt = {
      id: randomUUID(),
      createdAt: this.now().toISOString(),
      ...result,
    };
    this.db
      .prepare("INSERT INTO quiz_attempts VALUES(?,?,?,?)")
      .run(attempt.id, id, attempt.createdAt, JSON.stringify(result));
    return attempt;
  }
  claimMonth(month: string, leaseMs = 120000) {
    const now = this.now().getTime();
    return Boolean(
      this.db
        .prepare(
          `INSERT INTO monthly_jobs VALUES(?,?,NULL) ON CONFLICT(month_key) DO UPDATE SET lease_until=excluded.lease_until,last_error=NULL WHERE monthly_jobs.lease_until<=?`,
        )
        .run(month, now + leaseMs, now).changes,
    );
  }
  finishMonth(month: string, error?: string) {
    this.db
      .prepare(
        "UPDATE monthly_jobs SET lease_until=?,last_error=? WHERE month_key=?",
      )
      .run(
        error ? this.now().getTime() + 6 * 60 * 60 * 1000 : 0,
        error || null,
        month,
      );
  }
  jobStatus(month: string) {
    const row = this.db
      .prepare("SELECT * FROM monthly_jobs WHERE month_key=?")
      .get(month) as Row | undefined;
    return row
      ? {
          pending:
            !row.last_error && Number(row.lease_until) > this.now().getTime(),
          error: row.last_error as string | null,
        }
      : null;
  }
}
const state = globalThis as typeof globalThis & {
  frenchLearningStore?: LearningStore;
};
export function getStore() {
  if (!state.frenchLearningStore) {
    try {
      state.frenchLearningStore = new LearningStore(
        path.join(
          process.env.DATA_DIR || path.join(process.cwd(), "data"),
          "learning.sqlite",
        ),
      );
    } catch {
      throw new AppError(
        "STORAGE_UNAVAILABLE",
        "Saved learning could not be opened. Ask a parent to check the data volume and available disk space.",
        503,
      );
    }
  }
  return state.frenchLearningStore;
}
