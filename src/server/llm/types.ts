import "server-only";
import type { AnalysisContent } from "@/types/homework";
import type { ReviewInput, AnswerReview } from "@/lib/homework/review";
import type { LearningContext, QuizPack } from "@/lib/learning/quiz";
export type ProviderId = "gemini" | "openai" | "xai";
export type HomeworkInput =
  | { kind: "text"; text: string }
  | {
      kind: "image";
      bytes: Uint8Array;
      mimeType: "image/jpeg" | "image/png" | "image/webp";
    };
export interface LLMProvider {
  readonly id: ProviderId;
  readonly model: string;
  readonly capabilities: { imageInput: boolean; structuredOutput: boolean };
  analyzeHomework(
    input: HomeworkInput,
    options: { signal: AbortSignal },
  ): Promise<AnalysisContent>;
  reviewAnswer?(
    input: ReviewInput,
    options: { signal: AbortSignal },
  ): Promise<AnswerReview>;
  generateQuiz?(
    input: LearningContext,
    options: { signal: AbortSignal },
  ): Promise<QuizPack>;
}
