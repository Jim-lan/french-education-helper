import { IdSchema } from "@/lib/learning/quiz";
import { publicQuiz } from "@/lib/learning/types";
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
      throw new AppError("NOT_FOUND", "That note could not be found.", 404);
    const store = getStore();
    return Response.json(
      {
        ok: true,
        lesson: store.getLesson(id),
        quizzes: store.quizVersions("lesson", id).map(publicQuiz),
      },
      { headers: privateHeaders },
    );
  } catch (error) {
    return jsonError(error);
  }
}
