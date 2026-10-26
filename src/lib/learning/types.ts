import type { HomeworkAnalysis } from "@/lib/homework/schema";
import type { AnswerReview } from "@/lib/homework/review";
import type { QuizPack, QuizQuestion } from "./quiz";

export type Mark = { earned: number; total: number; percent: number };
export function reviewMark(review: AnswerReview): Mark | null {
  if (review.status === "needs_parent_review" || !review.requirements.length)
    return null;
  const total = review.requirements.length;
  const earned = review.requirements.filter((item) => item.met).length;
  return { earned, total, percent: Math.round((100 * earned) / total) };
}
export type StudyAttempt = {
  id: string;
  lessonId: string;
  parentAttemptId: string | null;
  createdAt: string;
  kind: "homework" | "practice";
  taskFrench: string;
  answer: string;
  review: AnswerReview;
  mark: Mark | null;
};
export type Lesson = {
  id: string;
  createdAt: string;
  dateKey: string;
  monthKey: string;
  analysis: HomeworkAnalysis;
  hasImage: boolean;
  attempts: StudyAttempt[];
};
export type HistoryItem = {
  id: string;
  createdAt: string;
  dateKey: string;
  monthKey: string;
  title: string;
  hasImage: boolean;
  attemptCount: number;
  latestMark: Mark | null;
  bestMark: Mark | null;
  status: "new" | AnswerReview["status"];
};
export type QuizAttempt = {
  id: string;
  createdAt: string;
  mark: Mark;
  results: {
    questionId: string;
    answer: string;
    correct: boolean;
    correctAnswer: string;
    explanationEnglish: string;
  }[];
};
export type SavedQuiz = {
  id: string;
  kind: "lesson" | "monthly";
  scopeKey: string;
  createdAt: string;
  revision: string;
  pack: QuizPack;
  attempts: QuizAttempt[];
};
export type PublicQuestion = Omit<
  QuizQuestion,
  "answer" | "acceptedAnswers" | "explanationEnglish"
>;
export type PublicQuiz = Omit<SavedQuiz, "pack"> & {
  pack: Omit<QuizPack, "questions"> & { questions: PublicQuestion[] };
};
export function publicQuiz(quiz: SavedQuiz): PublicQuiz {
  return {
    ...quiz,
    pack: {
      ...quiz.pack,
      questions: quiz.pack.questions.map(
        ({
          answer: _answer,
          acceptedAnswers: _accepted,
          explanationEnglish: _explanation,
          ...question
        }) => question,
      ),
    },
  };
}
export type MonthlyStats = {
  month: string;
  notes: number;
  homeworkAttempts: number;
  practiceAttempts: number;
  completedNotes: number;
  latestAverage: number | null;
  words: string[];
};
