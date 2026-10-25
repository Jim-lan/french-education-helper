import { ReviewRequestSchema } from "@/lib/homework/review";
import { readUpload } from "@/server/homework/input";
import { reviewAnswer } from "@/server/homework/review";
import { requestLimiter } from "@/server/homework/limits";
import { createProvider } from "@/server/llm/provider-factory";
import { AppError, safeError } from "@/server/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  let release: (() => void) | undefined;
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  try {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.headers.get("host"))
      throw new AppError(
        "INVALID_ORIGIN",
        "Open the app directly to check your answer.",
        403,
      );
    if (
      request.headers
        .get("content-type")
        ?.split(";")[0]
        .trim()
        .toLowerCase() !== "application/json"
    )
      throw new AppError(
        "INVALID_INPUT",
        "Submit your answer using the answer form.",
      );
    release = requestLimiter.acquire();
    const bytes = await readUpload(request, 250000);
    let raw: unknown;
    try {
      raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    } catch {
      throw new AppError(
        "INVALID_INPUT",
        "Your answer could not be read. Please try again.",
      );
    }
    const input = ReviewRequestSchema.safeParse(raw);
    if (!input.success)
      throw new AppError(
        "INVALID_INPUT",
        "Include the teacher's note and a written answer (up to 10,000 characters).",
      );
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(60000),
    ]);
    return Response.json(
      {
        ok: true,
        data: await reviewAnswer(input.data, createProvider(), signal),
      },
      { headers },
    );
  } catch (error) {
    const safe = safeError(error);
    return Response.json(
      { ok: false, error: { code: safe.code, message: safe.message } },
      {
        status: safe.status,
        headers: {
          ...headers,
          ...(safe.status === 429 ? { "Retry-After": "60" } : {}),
        },
      },
    );
  } finally {
    release?.();
  }
}
