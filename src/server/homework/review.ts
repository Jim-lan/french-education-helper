import "server-only";
import {
  AnswerReviewSchema,
  ReviewRequestSchema,
  type ReviewInput,
} from "@/lib/homework/review";
import type { LLMProvider } from "../llm/types";
import { AppError } from "../errors";
export async function reviewAnswer(
  input: ReviewInput,
  provider: LLMProvider,
  signal: AbortSignal,
) {
  const request = ReviewRequestSchema.safeParse(input);
  if (!request.success)
    throw new AppError(
      "INVALID_INPUT",
      "Include the teacher's note and your answer (up to 10,000 characters).",
    );
  if (!provider.reviewAnswer)
    throw new AppError(
      "UNSUPPORTED_OPERATION",
      "The selected provider cannot check answers yet.",
      503,
    );
  const result = AnswerReviewSchema.safeParse(
    await provider.reviewAnswer(request.data, { signal }),
  );
  if (!result.success)
    throw new AppError(
      "INVALID_AI_RESPONSE",
      "The feedback was incomplete. Please check your answer again.",
      502,
    );
  return result.data;
}
