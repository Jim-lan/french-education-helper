import type { Mark } from "@/lib/learning/types";
export function MarkBadge({
  mark,
  label = "Requirements met",
}: {
  mark: Mark | null;
  label?: string;
}) {
  return (
    <span
      className={`mark-badge ${mark && mark.percent >= 80 ? "good-mark" : ""}`}
    >
      {mark
        ? `${mark.earned}/${mark.total} · ${mark.percent}%`
        : "Parent review needed"}
      <small>{mark ? label : "No numerical mark"}</small>
    </span>
  );
}
