import "server-only";
import {
  AnalysisContentSchema,
  HomeworkAnalysisSchema,
} from "@/lib/homework/schema";
import { segmentFrench } from "@/lib/french/segment";
import type { HomeworkInput, LLMProvider } from "../llm/types";
import { AppError } from "../errors";
import { validateText } from "./input";
export async function analyzeHomework(
  input: HomeworkInput,
  provider: LLMProvider,
  signal: AbortSignal,
) {
  if (input.kind === "text") validateText(input.text);
  if (input.kind === "image" && !provider.capabilities.imageInput)
    throw new AppError(
      "UNSUPPORTED_IMAGE",
      "The selected provider cannot read images.",
    );
  const content = AnalysisContentSchema.safeParse(
    await provider.analyzeHomework(input, { signal }),
  );
  if (!content.success)
    throw new AppError(
      "INVALID_AI_RESPONSE",
      "The AI returned an incomplete explanation. Please try again.",
      502,
    );
  const originalFrench =
    input.kind === "text" ? input.text : content.data.originalFrench;
  return HomeworkAnalysisSchema.parse({
    ...content.data,
    originalFrench,
    schemaVersion: "1",
    sourceType: input.kind,
    sentences: segmentFrench(originalFrench),
  });
}
