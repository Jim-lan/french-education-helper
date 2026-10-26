"use client";
import { useCallback, useEffect, useState } from "react";
import type { Lesson } from "@/lib/learning/types";
import { OriginalDocument } from "./OriginalDocument";
import { HomeworkResults } from "./HomeworkResults";
export function SavedLesson({ id }: { id: string }) {
  const [lesson, setLesson] = useState<Lesson | null>(null),
    [error, setError] = useState("");
  const reload = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(`/api/history/${id}`, {
          cache: "no-store",
          signal,
        });
        const data = await response.json();
        if (!response.ok || !data.ok)
          throw new Error(
            data.error?.message || "That note could not be loaded.",
          );
        setLesson(data.lesson);
        setError("");
      } catch (failure) {
        if (!signal?.aborted)
          setError(
            failure instanceof Error && !(failure instanceof TypeError)
              ? failure.message
              : "We couldn't load this note. Try refreshing.",
          );
      }
    },
    [id],
  );
  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal);
    return () => controller.abort();
  }, [reload]);
  return (
    <main className="learning-page saved-lesson">
      <a className="back-link" href="/history">
        ← All learning history
      </a>
      <section className="learning-heading">
        <p className="eyebrow">READ · REMEMBER · TRY AGAIN</p>
        <h1>A chance to grow.</h1>
        <p>
          {lesson
            ? `Saved ${lesson.dateKey}. Review earlier tries below, or redo the teacher’s task. Previous marks are preserved.`
            : "Opening your saved note…"}
        </p>
      </section>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {lesson && (
        <>
          {lesson.hasImage && (
            <OriginalDocument
              url={`/api/history/${id}/image`}
              filename={`Homework · ${lesson.dateKey}`}
            />
          )}
          <HomeworkResults
            key={lesson.id}
            analysis={lesson.analysis}
            lessonId={lesson.id}
            attempts={lesson.attempts}
            onSaved={() => void reload()}
            onCorrect={() => {
              sessionStorage.setItem(
                "french-correction",
                lesson.analysis.originalFrench,
              );
              window.location.assign("/");
            }}
          />
        </>
      )}
    </main>
  );
}
