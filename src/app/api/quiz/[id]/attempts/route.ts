import { IdSchema, QuizAnswersSchema } from "@/lib/learning/quiz";
import { getStore } from "@/server/learning/store";
import { readJson, privateHeaders, jsonError } from "@/server/learning/http";
import { AppError } from "@/server/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const input = QuizAnswersSchema.safeParse(await readJson(request));
    const { id } = await context.params;
    if (!IdSchema.safeParse(id).success || !input.success)
      throw new AppError(
        "INVALID_INPUT",
        "Answer every question using the quiz form.",
      );
    return Response.json(
      { ok: true, attempt: getStore().grade(id, input.data.answers) },
      { headers: privateHeaders },
    );
  } catch (error) {
    return jsonError(error);
  }
}
