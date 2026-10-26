import "server-only";
import { AppError, safeError } from "@/server/errors";
import { readUpload } from "@/server/homework/input";
export const privateHeaders = {
  "Cache-Control": "no-store, private",
  "X-Content-Type-Options": "nosniff",
};
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    (origin && new URL(origin).host !== request.headers.get("host")) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new AppError(
      "INVALID_ORIGIN",
      "Open the app directly to use your learning history.",
      403,
    );
}
export async function readJson(request: Request) {
  checkOrigin(request);
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new AppError("INVALID_INPUT", "Submit this request using the app.");
  const bytes = await readUpload(request, 250000);
  try {
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    ) as unknown;
  } catch {
    throw new AppError(
      "INVALID_INPUT",
      "The request could not be read. Please try again.",
    );
  }
}
export function jsonError(error: unknown) {
  const safe = safeError(error);
  return Response.json(
    { ok: false, error: { code: safe.code, message: safe.message } },
    {
      status: safe.status,
      headers: {
        ...privateHeaders,
        ...(safe.status === 429 ? { "Retry-After": "60" } : {}),
      },
    },
  );
}
