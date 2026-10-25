import "server-only";
import { AppError } from "./errors";
/** Enforce the cap incrementally even without a truthful Content-Length. */
export async function readLimitedBody(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
) {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new AppError(
          "INPUT_TOO_LARGE",
          "This request is too large. Use a smaller image or less text.",
          413,
        );
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
