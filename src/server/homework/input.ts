import "server-only";
import { AppError } from "../errors";
import { readLimitedBody } from "../http";
import type { HomeworkInput } from "../llm/types";
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_BODY_BYTES = 12 * 1024 * 1024;
async function readUpload(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new AppError(
      "INPUT_TOO_LARGE",
      "This request is too large. Use a smaller image or less text.",
      413,
    );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const signal = AbortSignal.any([request.signal, controller.signal]);
    return await readLimitedBody(
      request.body?.pipeThrough(new TransformStream(), { signal }) ?? null,
      limit,
    );
  } finally {
    clearTimeout(timer);
  }
}
export function validateText(text: string) {
  if (!text.trim())
    throw new AppError("INVALID_INPUT", "Paste some French text first.");
  if (text.length > 10000)
    throw new AppError(
      "INPUT_TOO_LARGE",
      "Use 10,000 characters or fewer.",
      413,
    );
  return text;
}
export function identifyImage(bytes: Uint8Array) {
  const b = Buffer.from(bytes);
  if (
    b.length >= 24 &&
    b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    b.toString("ascii", 12, 16) === "IHDR"
  )
    return "image/png" as const;
  if (b.length >= 4 && b[0] === 255 && b[1] === 216 && b[2] === 255)
    return "image/jpeg" as const;
  if (
    b.length >= 16 &&
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp" as const;
  return null;
}
export async function parseInput(request: Request): Promise<HomeworkInput> {
  const type = request.headers.get("content-type") || "";
  if (type.toLowerCase().split(";")[0].trim() === "application/json") {
    const bytes = await readUpload(request, 100000);
    let body: unknown;
    try {
      body = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      );
    } catch {
      throw new AppError(
        "INVALID_INPUT",
        "The text could not be read. Please paste it again.",
      );
    }
    if (
      !body ||
      typeof body !== "object" ||
      Object.keys(body).length !== 1 ||
      !("text" in body) ||
      typeof body.text !== "string"
    )
      throw new AppError("INVALID_INPUT", "Submit one French text field.");
    return { kind: "text", text: validateText(body.text) };
  }
  if (!type.toLowerCase().startsWith("multipart/form-data;"))
    throw new AppError(
      "INVALID_INPUT",
      "Submit text or an image using the homework form.",
    );
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES)
    throw new AppError(
      "INPUT_TOO_LARGE",
      "This request is too large. Use an image under 10 MiB.",
      413,
    );
  const bytes = await readUpload(request, MAX_BODY_BYTES);
  let form: FormData;
  try {
    form = await new Response(bytes as BodyInit, {
      headers: { "content-type": type },
    }).formData();
  } catch {
    throw new AppError(
      "INVALID_INPUT",
      "The upload could not be read. Please select the file again.",
    );
  }
  const entries = [...form.entries()];
  if (entries.length !== 1 || !["text", "image"].includes(entries[0][0]))
    throw new AppError(
      "INVALID_INPUT",
      "Choose either pasted text or one image.",
    );
  const [name, value] = entries[0];
  if (name !== "image" || typeof value === "string" || !value.size)
    throw new AppError("INVALID_INPUT", "Choose a homework image first.");
  if (value.size > MAX_IMAGE_BYTES)
    throw new AppError("INPUT_TOO_LARGE", "Choose an image under 10 MiB.", 413);
  const imageBytes = new Uint8Array(await value.arrayBuffer());
  const mimeType = identifyImage(imageBytes);
  if (!mimeType || value.type !== mimeType)
    throw new AppError(
      "UNSUPPORTED_IMAGE",
      "Use a JPEG, PNG, or WebP image. For HEIC photos, export or take a screenshot as JPEG or PNG.",
      415,
    );
  return { kind: "image", bytes: imageBytes, mimeType };
}
