import { MonthSchema } from "@/lib/learning/quiz";
import { publicQuiz } from "@/lib/learning/types";
import { getStore } from "@/server/learning/store";
import { checkOrigin, privateHeaders, jsonError } from "@/server/learning/http";
import { calendarKeys } from "@/server/learning/calendar";
import { AppError } from "@/server/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    checkOrigin(request);
    const store = getStore(),
      month =
        new URL(request.url).searchParams.get("month") ||
        store.months()[0] ||
        calendarKeys().monthKey;
    if (!MonthSchema.safeParse(month).success)
      throw new AppError("INVALID_INPUT", "Choose a valid month.");
    const quizzes = store.quizVersions("monthly", month),
      lessons = store.monthLessons(month);
    return Response.json(
      {
        ok: true,
        month,
        months: store.months(),
        currentMonth: calendarKeys().monthKey,
        stats: store.stats(month),
        quizzes: quizzes.map(publicQuiz),
        hasNewWork: Boolean(
          quizzes[0] && quizzes[0].revision !== store.revision(lessons),
        ),
        job: store.jobStatus(month),
      },
      { headers: privateHeaders },
    );
  } catch (error) {
    return jsonError(error);
  }
}
