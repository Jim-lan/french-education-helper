"use client";
import { useEffect, useRef, useState } from "react";
import type { PublicQuiz } from "@/lib/learning/types";
import { QuizGame } from "./QuizGame";
export function GameLauncher({
  kind,
  scope,
  initialQuizzes = [],
  hasNewWork = false,
  onCreated,
}: {
  kind: "lesson" | "monthly";
  scope: string;
  initialQuizzes?: PublicQuiz[];
  hasNewWork?: boolean;
  onCreated?: () => void;
}) {
  const [quizzes, setQuizzes] = useState(initialQuizzes),
    [selected, setSelected] = useState(initialQuizzes[0]?.id || "");
  const [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    if (kind !== "lesson" || initialQuizzes.length) return;
    const current = new AbortController();
    void fetch(`/api/history/${scope}`, { signal: current.signal })
      .then((response) => response.json())
      .then((data) => {
        if (data.ok && data.quizzes?.length) {
          setQuizzes(data.quizzes);
          setSelected(data.quizzes[0].id);
        }
      })
      .catch(() => {});
    return () => current.abort();
  }, [kind, scope, initialQuizzes.length]);
  useEffect(() => () => controller.current?.abort(), []);
  async function generate() {
    if (loading) return;
    setLoading(true);
    setError("");
    const current = new AbortController();
    controller.current = current;
    const timer = setTimeout(() => current.abort(), 80000);
    try {
      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "lesson"
            ? { kind, lessonId: scope }
            : { kind, month: scope },
        ),
        signal: current.signal,
      });
      const data = await response.json();
      if (!response.ok || !data.ok)
        throw new Error(
          data.error?.message || "The quiz could not be prepared. Try again.",
        );
      setQuizzes((previous) => [
        data.quiz,
        ...previous.filter((q) => q.id !== data.quiz.id),
      ]);
      setSelected(data.quiz.id);
      onCreated?.();
    } catch (failure) {
      if (!current.signal.aborted)
        setError(
          failure instanceof Error && !(failure instanceof TypeError)
            ? failure.message
            : "We couldn't connect. Please try again.",
        );
      else setError("Preparing the quiz took too long. Please try again.");
    } finally {
      clearTimeout(timer);
      if (controller.current === current) {
        setLoading(false);
        controller.current = null;
      }
    }
  }
  const quiz = quizzes.find((q) => q.id === selected);
  return (
    <section
      className="game-launcher"
      aria-label={
        kind === "lesson" ? "Extra learning game" : "Monthly summary quiz"
      }
    >
      {(!quiz || hasNewWork) && (
        <div className="game-invitation">
          <span aria-hidden="true">🎨 🎵 ✏️</span>
          <h3>
            {kind === "lesson"
              ? "Ready for a little learning adventure?"
              : "Bring this month’s learning together"}
          </h3>
          <p>
            {hasNewWork
              ? "There is new work since this quiz was prepared. Create an updated version; earlier versions and marks stay saved."
              : "Practise spelling, word meanings, sentences and French sounds in a short game. Preparing new content uses AI once."}
          </p>
          <button
            className="primary-button"
            type="button"
            disabled={loading}
            onClick={generate}
          >
            {loading
              ? "Preparing your adventure…"
              : hasNewWork
                ? "Update monthly review"
                : kind === "lesson"
                  ? "Create my learning game"
                  : "Create monthly review & quiz"}
          </button>
        </div>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {quizzes.length > 1 && (
        <label className="version-select">
          Saved quiz versions
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            {quizzes.map((q, index) => (
              <option key={q.id} value={q.id}>
                {new Date(q.createdAt).toLocaleString("en-CA")}{" "}
                {index === 0 ? "· latest" : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      {quiz && <QuizGame key={quiz.id} quiz={quiz} />}
    </section>
  );
}
