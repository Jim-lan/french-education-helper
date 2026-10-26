import { IdSchema } from "@/lib/learning/quiz";
import { getStore } from "@/server/learning/store";
import { checkOrigin, privateHeaders, jsonError } from "@/server/learning/http";
import { AppError } from "@/server/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const { id } = await context.params;
    if (!IdSchema.safeParse(id).success)
      throw new AppError("NOT_FOUND", "That image could not be found.", 404);
    const image = getStore().getImage(id);
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        ...privateHeaders,
        "Content-Type": image.mimeType,
        "Content-Disposition": "inline",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
