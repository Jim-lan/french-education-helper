import { QuizGenerateSchema } from "@/lib/learning/quiz";
import { publicQuiz } from "@/lib/learning/types";
import { getStore } from "@/server/learning/store";
import { prepareQuiz } from "@/server/learning/quiz-service";
import { readJson, privateHeaders, jsonError } from "@/server/learning/http";
import { createProvider } from "@/server/llm/provider-factory";
import { requestLimiter } from "@/server/homework/limits";
import { AppError } from "@/server/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  let release: (() => void) | undefined;
  try {
    const input = QuizGenerateSchema.safeParse(await readJson(request));
    if (!input.success)
      throw new AppError(
        "INVALID_INPUT",
        "Choose a saved lesson or review month.",
      );
    const store = getStore();
    // Explicit retries clear failed-job backoff, but never steal a live lease.
    if (
      input.data.kind === "monthly" &&
      store.jobStatus(input.data.month)?.error
    )
      store.finishMonth(input.data.month);
    release = requestLimiter.acquire();
    const quiz = await prepareQuiz(
      store,
      input.data,
      createProvider,
      AbortSignal.any([request.signal, AbortSignal.timeout(60000)]),
    );
    return Response.json(
      { ok: true, quiz: publicQuiz(quiz) },
      { headers: privateHeaders },
    );
  } catch (error) {
    return jsonError(error);
  } finally {
    release?.();
  }
}
