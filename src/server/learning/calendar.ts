import "server-only";
export function calendarKeys(
  date = new Date(),
  timeZone = process.env.APP_TIMEZONE || "America/Toronto",
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  const monthKey = `${part("year")}-${part("month")}`;
  return { dateKey: `${monthKey}-${part("day")}`, monthKey };
}
