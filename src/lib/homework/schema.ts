import { z } from "zod";

export const AnalysisContentSchema = z.strictObject({
  originalFrench: z.string().min(1).max(30000),
  englishTranslation: z.string().min(1).max(30000),
  studentExplanation: z.string().min(1).max(10000),
  steps: z.array(z.string().min(1).max(1000)).max(50),
  warnings: z
    .array(
      z.strictObject({
        code: z.enum([
          "UNCLEAR_SOURCE",
          "PARTIAL_EXTRACTION",
          "MIXED_LANGUAGE",
        ]),
        message: z.string().min(1).max(1000),
        sourceExcerpt: z.string().max(1000).optional(),
      }),
    )
    .max(50),
});
export const HomeworkAnalysisSchema = AnalysisContentSchema.extend({
  schemaVersion: z.literal("1"),
  sourceType: z.enum(["text", "image"]),
  sentences: z
    .array(
      z.strictObject({
        text: z.string().min(1).max(30000),
        start: z.number().int().nonnegative(),
        end: z.number().int().positive(),
      }),
    )
    .max(2000),
}).superRefine((value, ctx) => {
  let previousEnd = 0;
  for (const sentence of value.sentences) {
    if (
      sentence.start < previousEnd ||
      sentence.end <= sentence.start ||
      sentence.end > value.originalFrench.length ||
      value.originalFrench.slice(sentence.start, sentence.end) !== sentence.text
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Sentence spans must match the original French.",
      });
    }
    previousEnd = sentence.end;
  }
});
export type AnalysisContent = z.infer<typeof AnalysisContentSchema>;
export type HomeworkAnalysis = z.infer<typeof HomeworkAnalysisSchema>;
export const AnalyzeResponseSchema = z.discriminatedUnion("ok", [
  z.strictObject({ ok: z.literal(true), data: HomeworkAnalysisSchema }),
  z.strictObject({
    ok: z.literal(false),
    error: z.strictObject({ code: z.string(), message: z.string() }),
  }),
]);
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
