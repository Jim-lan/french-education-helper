import { analyzeHomework } from "@/server/homework/analyze";
import { parseInput } from "@/server/homework/input";
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
        "Open the app directly and submit your note there.",
        403,
      );
    release = requestLimiter.acquire();
    const input = await parseInput(request);
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(60000),
    ]);
    const data = await analyzeHomework(input, createProvider(), signal);
    return Response.json({ ok: true, data }, { headers });
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
