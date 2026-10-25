import { z } from "zod";
export const ReviewRequestSchema = z.strictObject({
  originalFrench: z
    .string()
    .min(1)
    .max(30000)
    .refine((text) => Boolean(text.trim())),
  answer: z
    .string()
    .min(1)
    .max(10000)
    .refine((text) => Boolean(text.trim())),
});
export const ReviewContentSchema = z.strictObject({
  status: z.enum(["passed", "needs_work", "needs_parent_review"]),
  summaryEnglish: z.string().min(1).max(2000),
  requirements: z
    .array(
      z.strictObject({
        requirementEnglish: z.string().min(1).max(500),
        met: z.boolean(),
        feedbackEnglish: z.string().min(1).max(1000),
      }),
    )
    .max(12),
  strengths: z.array(z.string().min(1).max(500)).max(6),
  improvements: z.array(z.string().min(1).max(500)).max(6),
  practice: z
    .strictObject({
      instructionFrench: z.string().min(1).max(2000),
      instructionEnglish: z.string().min(1).max(2000),
      hintEnglish: z.string().min(1).max(1000),
    })
    .nullable(),
});
export const AnswerReviewSchema = ReviewContentSchema.superRefine(
  (review, ctx) => {
    if (
      review.status === "passed" &&
      (!review.requirements.length ||
        review.requirements.some((item) => !item.met) ||
        review.practice !== null)
    )
      ctx.addIssue({
        code: "custom",
        message: "Passing requires all teacher requirements to be met.",
      });
    if (
      review.status === "needs_work" &&
      (!review.requirements.some((item) => !item.met) || !review.practice)
    )
      ctx.addIssue({
        code: "custom",
        message: "A revision needs a missed requirement and targeted practice.",
      });
  },
);
export const ReviewResponseSchema = z.discriminatedUnion("ok", [
  z.strictObject({ ok: z.literal(true), data: AnswerReviewSchema }),
  z.strictObject({
    ok: z.literal(false),
    error: z.strictObject({ code: z.string(), message: z.string() }),
  }),
]);
export type ReviewInput = z.infer<typeof ReviewRequestSchema>;
export type AnswerReview = z.infer<typeof AnswerReviewSchema>;
