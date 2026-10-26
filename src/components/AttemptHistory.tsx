"use client";
import type { StudyAttempt } from "@/lib/learning/types";
import { FrenchAudioText } from "./FrenchAudioText";
import { Feedback } from "./Feedback";
import { MarkBadge } from "./MarkBadge";
export function AttemptHistory({ attempts }: { attempts: StudyAttempt[] }) {
  if (!attempts.length) return null;
  return (
    <section className="attempt-history" aria-label="Saved answer attempts">
      <h3>Every try counts</h3>
      <p className="muted small">
        Earlier answers and marks stay here when you redo a task.
      </p>
      {[...attempts].reverse().map((attempt, index) => (
        <details key={attempt.id}>
          <summary>
            <span>
              {attempt.kind === "practice" ? "Practice" : "Homework"} attempt ·{" "}
              {new Date(attempt.createdAt).toLocaleString("en-CA")}
              <small>Saved try {attempts.length - index}</small>
            </span>
            <MarkBadge mark={attempt.mark} />
          </summary>
          {attempt.kind === "practice" && (
            <FrenchAudioText
              text={attempt.taskFrench}
              label="Saved practice question"
            />
          )}
          <FrenchAudioText text={attempt.answer} label="Saved French answer" />
          <Feedback review={attempt.review} />
        </details>
      ))}
    </section>
  );
}
