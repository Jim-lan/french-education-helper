"use client";
import { useEffect, useState } from "react";
import type { MonthlyStats, PublicQuiz } from "@/lib/learning/types";
import { GameLauncher } from "./GameLauncher";
import { Pronunciation } from "./Pronunciation";
import { FrenchPassage } from "./FrenchPassage";
type MonthData = {
  month: string;
  months: string[];
  currentMonth: string;
  stats: MonthlyStats;
  quizzes: PublicQuiz[];
  hasNewWork: boolean;
  job: { pending: boolean; error: string | null } | null;
};
export function MonthlyReviewPage() {
  const [month, setMonth] = useState(""),
    [data, setData] = useState<MonthData | null>(null),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void fetch(`/api/monthly${month ? `?month=${month}` : ""}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((result) => {
        if (!result.ok)
          throw new Error(
            result.error?.message || "Monthly reviews could not be loaded.",
          );
        setData(result);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error && !(failure instanceof TypeError)
              ? failure.message
              : "We couldn't load the monthly review.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month, refresh]);
  useEffect(() => {
    if (!data?.job?.pending) return;
    const timer = setInterval(() => setRefresh((value) => value + 1), 10000);
    return () => clearInterval(timer);
  }, [data?.job?.pending]);
  const stats = data?.stats;
  return (
    <main className="learning-page">
      <section className="learning-heading">
        <p className="eyebrow">SMALL STEPS ADD UP</p>
        <h1>A month of growing.</h1>
        <p>
          Revisit the words and ideas you have practised. Your monthly summary
          brings saved work together in a short, playful quiz.
        </p>
      </section>
      <div className="history-filters">
        <label>
          Review month
          <select
            value={month || data?.month || ""}
            onChange={(event) => setMonth(event.target.value)}
          >
            {!data?.months.length && (
              <option value={data?.month || ""}>No saved learning yet</option>
            )}
            {data?.months.map((value) => (
              <option key={value} value={value}>
                {value}
                {value === data.currentMonth ? " · in progress" : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="text-button"
          onClick={() => setRefresh((value) => value + 1)}
        >
          Refresh review status
        </button>
        <a href="/history" className="secondary-button">
          Browse notes →
        </a>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="muted small">
          Loading monthly learning…
        </p>
      )}
      {data && stats && !loading && (
        <>
          <div className="progress-cards">
            <div>
              <strong>{stats.notes}</strong>
              <span>saved notes</span>
            </div>
            <div>
              <strong>{stats.completedNotes}</strong>
              <span>basic tasks passed</span>
            </div>
            <div>
              <strong>{stats.homeworkAttempts + stats.practiceAttempts}</strong>
              <span>checked attempts</span>
            </div>
            <div>
              <strong>
                {stats.latestAverage === null ? "—" : `${stats.latestAverage}%`}
              </strong>
              <span>latest requirement average</span>
            </div>
          </div>
          <p className="muted small">
            The average uses the latest marked homework attempt for each note.
            Parent-review tasks are excluded. A passed task stays counted as
            completed even if you retry it.
          </p>
          {!stats.notes ? (
            <div className="empty-state">
              <span aria-hidden="true">🌱</span>
              <h2>Let’s plant the first seed</h2>
              <p>Saved French notes will build your first monthly review.</p>
              <a className="primary-button" href="/">
                Start a note
              </a>
            </div>
          ) : (
            <Pronunciation>
              <details className="month-words">
                <summary>Words from this month · {stats.words.length}</summary>
                {stats.words.map((word) => (
                  <FrenchPassage key={word} text={word} />
                ))}
              </details>
              <p className="saved-notice">
                {data.month === data.currentMonth
                  ? "This month is still growing. You can preview a review now and update it after more practice."
                  : "Completed months get a review automatically while the app is running. The app catches up after downtime; you can also create one now."}{" "}
                Summaries use up to the 30 most recent notes; progress counts
                include every saved note.
              </p>
              {data.job?.pending && (
                <p role="status" className="notice">
                  Your monthly review is being prepared. This page checks for
                  its arrival automatically.
                </p>
              )}
              {data.job?.error && (
                <p className="notice">
                  The automatic review could not finish: {data.job.error} Use
                  Create below to retry.
                </p>
              )}
              {!data.job?.pending && (
                <GameLauncher
                  key={`${data.month}:${data.quizzes[0]?.id || "new"}`}
                  kind="monthly"
                  scope={data.month}
                  initialQuizzes={data.quizzes}
                  hasNewWork={data.hasNewWork}
                  onCreated={() => setRefresh((value) => value + 1)}
                />
              )}
            </Pronunciation>
          )}
        </>
      )}
    </main>
  );
}
