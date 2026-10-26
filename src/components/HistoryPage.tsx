"use client";
import { useEffect, useState } from "react";
import type { HistoryItem } from "@/lib/learning/types";
import { MarkBadge } from "./MarkBadge";
import { Pronunciation } from "./Pronunciation";
import { FrenchPassage } from "./FrenchPassage";

export function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]),
    [months, setMonths] = useState<string[]>([]);
  const [month, setMonth] = useState(""),
    [date, setDate] = useState(""),
    [zone, setZone] = useState("");
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const query = new URLSearchParams();
    if (month) query.set("month", month);
    if (date) query.set("date", date);
    void fetch(`/api/history?${query}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok)
          throw new Error(
            data.error?.message || "History could not be loaded.",
          );
        setItems(data.items);
        setMonths(data.months);
        setZone(data.timeZone);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error && !(failure instanceof TypeError)
              ? failure.message
              : "We couldn't load history. Try refreshing.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month, date]);
  const groups = new Map<string, HistoryItem[]>();
  for (const item of items)
    groups.set(item.dateKey, [...(groups.get(item.dateKey) || []), item]);
  return (
    <main className="learning-page">
      <section className="learning-heading">
        <p className="eyebrow">LOOK HOW FAR YOU’VE COME</p>
        <h1>Our learning journal.</h1>
        <p>
          Find a note, listen again, compare marks, and give it another try.
          Every checked attempt stays saved on your home server.
        </p>
      </section>
      <div className="history-filters">
        <label>
          Month
          <select
            value={month}
            onChange={(event) => {
              setMonth(event.target.value);
              setDate("");
            }}
          >
            <option value="">All months</option>
            {months.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Find a date
          <input
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              if (event.target.value) setMonth(event.target.value.slice(0, 7));
            }}
          />
        </label>
        <button
          className="text-button"
          type="button"
          onClick={() => {
            setMonth("");
            setDate("");
          }}
        >
          Clear filters
        </button>
        <a className="secondary-button" href="/monthly">
          Monthly reviews →
        </a>
      </div>
      <p className="muted small">
        Dates use {zone || "the household calendar time zone"}. Marks show
        requirements met, not a school report-card grade.
      </p>
      {loading && (
        <p role="status" className="empty-state">
          Opening your journal…
        </p>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {!loading && !error && !items.length && (
        <div className="empty-state">
          <span aria-hidden="true">📚</span>
          <h2>A fresh page for learning</h2>
          <p>
            No saved notes for this date yet. Start with a French note and it
            will appear here.
          </p>
          <a className="primary-button" href="/">
            Add a French note
          </a>
        </div>
      )}
      {!loading && !error && (
        <Pronunciation>
          {[...groups].map(([day, records]) => (
            <section
              className="history-day"
              key={day}
              aria-label={`Learning on ${day}`}
            >
              <div className="date-heading">
                <h2>
                  <time dateTime={day}>
                    {new Date(`${day}T12:00:00`).toLocaleDateString("en-CA", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                </h2>
                <span>
                  {records.length} {records.length === 1 ? "note" : "notes"}
                </span>
              </div>
              <div className="history-cards">
                {records.map((item) => (
                  <article className="history-card" key={item.id}>
                    <div className="history-card-meta">
                      <span>
                        {item.hasImage ? "📷 Photo note" : "✏️ Text note"}
                      </span>
                      <span>
                        {item.attemptCount}{" "}
                        {item.attemptCount === 1 ? "try" : "tries"}
                      </span>
                    </div>
                    <FrenchPassage text={item.title} />
                    <div className="history-card-bottom">
                      <div>
                        {item.status === "new" ? (
                          <span className="result-badge">Ready to try</span>
                        ) : (
                          <MarkBadge mark={item.latestMark} />
                        )}
                        <small>
                          {item.status === "passed"
                            ? "Basic task passed"
                            : item.status === "needs_work"
                              ? "Keep practising"
                              : item.status === "needs_parent_review"
                                ? "Ask a parent"
                                : "No answer checked yet"}
                          {item.bestMark && ` · Best ${item.bestMark.percent}%`}
                        </small>
                      </div>
                      <a
                        href={`/history/${item.id}`}
                        className="secondary-button"
                      >
                        Review &amp; redo →
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </Pronunciation>
      )}
    </main>
  );
}
