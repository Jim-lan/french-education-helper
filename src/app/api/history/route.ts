import { MonthSchema, DateKeySchema } from "@/lib/learning/quiz";
import { getStore } from "@/server/learning/store";
import { checkOrigin, privateHeaders, jsonError } from "@/server/learning/http";
import { AppError } from "@/server/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    checkOrigin(request);
    const url = new URL(request.url),
      month = url.searchParams.get("month") || undefined,
      date = url.searchParams.get("date") || undefined;
    if (
      (month && !MonthSchema.safeParse(month).success) ||
      (date && !DateKeySchema.safeParse(date).success)
    )
      throw new AppError("INVALID_INPUT", "Choose a valid month or date.");
    const store = getStore();
    return Response.json(
      {
        ok: true,
        items: store.history(month, date),
        months: store.months(),
        timeZone: process.env.APP_TIMEZONE || "America/Toronto",
      },
      { headers: privateHeaders },
    );
  } catch (error) {
    return jsonError(error);
  }
}
