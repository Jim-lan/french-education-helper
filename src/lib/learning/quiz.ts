import { z } from "zod";
export const MonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const DateKeySchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/);
export const IdSchema = z.string().uuid();
export const QuizQuestionSchema = z.strictObject({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
  type: z.enum(["spelling", "meaning", "sentence", "sound"]),
  promptFrench: z.string().min(1).max(1000),
  instructionEnglish: z.string().min(1).max(1000),
  listenFrench: z.string().max(300),
  emoji: z.enum([
    "🎈",
    "🐱",
    "🐶",
    "🌟",
    "📚",
    "🌳",
    "🎨",
    "🦋",
    "🚀",
    "🍎",
    "🎵",
    "✏️",
  ]),
  options: z.array(z.string().min(1).max(500)).max(4),
  answer: z.string().min(1).max(500),
  acceptedAnswers: z.array(z.string().min(1).max(500)).max(6),
  explanationEnglish: z.string().min(1).max(1000),
});
export const QuizContentSchema = z.strictObject({
  title: z.string().min(1).max(150),
  summaryEnglish: z.string().min(1).max(2000),
  strengths: z.array(z.string().min(1).max(500)).max(6),
  nextSteps: z.array(z.string().min(1).max(500)).max(6),
  examples: z
    .array(
      z.strictObject({
        french: z.string().min(1).max(1000),
        english: z.string().min(1).max(1000),
      }),
    )
    .max(4),
  questions: z.array(QuizQuestionSchema).min(4).max(10),
});
export const QuizPackSchema = QuizContentSchema.superRefine((pack, ctx) => {
  if (new Set(pack.questions.map((q) => q.id)).size !== pack.questions.length)
    ctx.addIssue({
      code: "custom",
      message: "Question identifiers must be unique.",
    });
  for (const q of pack.questions) {
    if (q.type === "spelling" && (!q.listenFrench.trim() || q.options.length))
      ctx.addIssue({
        code: "custom",
        message: "Spelling needs audio and a written answer.",
      });
    if (
      q.type !== "spelling" &&
      (q.options.length < 2 ||
        !q.options.includes(q.answer) ||
        new Set(q.options).size !== q.options.length)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Choice questions need distinct options and a matching answer.",
      });
    if (q.type === "sound" && !q.listenFrench.trim())
      ctx.addIssue({
        code: "custom",
        message: "Sound questions need an audio word.",
      });
    if (
      q.type !== "spelling" &&
      q.acceptedAnswers.some((answer) => answer !== q.answer)
    )
      ctx.addIssue({
        code: "custom",
        message: "Choice questions have one correct option.",
      });
  }
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type QuizPack = z.infer<typeof QuizPackSchema>;
export type LearningContext = {
  kind: "lesson" | "monthly";
  period: string;
  notes: {
    french: string;
    meanings: { french: string; english: string }[];
    feedback: string[];
  }[];
  progress: { notes: number; completed: number; attempts: number };
};
export const QuizGenerateSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("lesson"), lessonId: IdSchema }),
  z.strictObject({ kind: z.literal("monthly"), month: MonthSchema }),
]);
export const QuizAnswersSchema = z.strictObject({
  answers: z
    .array(
      z.strictObject({
        questionId: z.string().min(1).max(40),
        answer: z.string().max(500),
      }),
    )
    .min(4)
    .max(10),
});
/** Keep accents significant for spelling; ignore case, spacing and apostrophe style. */
export function normalizeAnswer(text: string) {
  return text
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("fr-CA")
    .replace(/[’ʼ]/g, "'")
    .replace(/\s+/g, " ");
}
export function gradeQuiz(
  pack: QuizPack,
  answers: z.infer<typeof QuizAnswersSchema>["answers"],
) {
  if (
    answers.length !== pack.questions.length ||
    new Set(answers.map((a) => a.questionId)).size !== answers.length ||
    answers.some((a) => !pack.questions.some((q) => q.id === a.questionId))
  )
    throw new Error("Answer every question once.");
  const results = pack.questions.map((q) => {
    const answer = answers.find((a) => a.questionId === q.id)!.answer;
    const correct =
      q.type === "spelling"
        ? [q.answer, ...q.acceptedAnswers].some(
            (a) => normalizeAnswer(a) === normalizeAnswer(answer),
          )
        : answer === q.answer;
    return {
      questionId: q.id,
      answer,
      correct,
      correctAnswer: q.answer,
      explanationEnglish: q.explanationEnglish,
    };
  });
  const earned = results.filter((r) => r.correct).length;
  return {
    results,
    mark: {
      earned,
      total: results.length,
      percent: Math.round((100 * earned) / results.length),
    },
  };
}
