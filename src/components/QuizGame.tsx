"use client";
import { useRef, useState, useEffect, type FormEvent } from "react";
import type { PublicQuiz, QuizAttempt } from "@/lib/learning/types";
import { FrenchAudioText } from "./FrenchAudioText";
import { FrenchPassage } from "./FrenchPassage";
import { usePronunciation } from "./Pronunciation";
import { MarkBadge } from "./MarkBadge";
import { SpeakerIcon } from "./Icons";

export function QuizGame({ quiz }: { quiz: PublicQuiz }) {
  const speech = usePronunciation();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attempts, setAttempts] = useState(quiz.attempts);
  const [result, setResult] = useState<QuizAttempt | null>(
    quiz.attempts.at(-1) || null,
  );
  const [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [effects, setEffects] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const quizStart = useRef<HTMLElement | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  function celebrate() {
    if (!effects) return;
    try {
      const context = new AudioContext();
      const gain = context.createGain();
      gain.gain.value = 0.06;
      gain.connect(context.destination);
      [523.25, 659.25, 783.99].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        oscillator.start(context.currentTime + index * 0.12);
        oscillator.stop(context.currentTime + index * 0.12 + 0.18);
      });
      setTimeout(() => void context.close(), 1200);
    } catch {
      /* Sound effects are optional; French pronunciation works separately. */
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading || result) return;
    setLoading(true);
    setError("");
    const current = new AbortController();
    controller.current = current;
    const timer = setTimeout(() => current.abort(), 20000);
    try {
      const response = await fetch(`/api/quiz/${quiz.id}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: quiz.pack.questions.map((q) => ({
            questionId: q.id,
            answer: answers[q.id] || "",
          })),
        }),
        signal: current.signal,
      });
      const data = await response.json();
      if (!response.ok || !data.ok)
        throw new Error(
          data.error?.message || "The quiz could not be marked. Try again.",
        );
      setResult(data.attempt);
      setAttempts((previous) => [...previous, data.attempt]);
      if (data.attempt.mark.percent >= 80) celebrate();
    } catch (failure) {
      if (!current.signal.aborted)
        setError(
          failure instanceof Error && !(failure instanceof TypeError)
            ? failure.message
            : "We couldn't save this try. Please try again.",
        );
      else setError("Saving took too long. Please try again.");
    } finally {
      clearTimeout(timer);
      if (controller.current === current) {
        controller.current = null;
        setLoading(false);
      }
    }
  }
  return (
    <section className="quiz-game" aria-label={quiz.pack.title} ref={quizStart}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">A LITTLE LEARNING ADVENTURE</p>
          <h3>{quiz.pack.title}</h3>
        </div>
        <span className="quiz-mascot" aria-hidden="true">
          🚀
        </span>
      </div>
      <p>{quiz.pack.summaryEnglish}</p>
      {!!quiz.pack.strengths.length && (
        <div className="quiz-summary">
          <div>
            <h4>Growing strengths</h4>
            <ul>
              {quiz.pack.strengths.map((text, i) => (
                <li key={i}>{text}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Keep practising</h4>
            <ul>
              {quiz.pack.nextSteps.map((text, i) => (
                <li key={i}>{text}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {quiz.pack.examples.map((example, index) => (
        <div className="quiz-model" key={index}>
          <FrenchAudioText
            text={example.french}
            label={`Review example ${index + 1}`}
          />
          <p>{example.english}</p>
        </div>
      ))}
      <label className="effects-toggle">
        <input
          type="checkbox"
          checked={effects}
          onChange={(event) => setEffects(event.target.checked)}
        />{" "}
        Celebration sound effects
      </label>
      <p className="muted small">
        Listen as often as you like. French accents count in spelling. Marking
        uses the saved answer key, with no AI call.
      </p>
      <form onSubmit={submit}>
        {quiz.pack.questions.map((question, index) => {
          const feedback = result?.results.find(
            (r) => r.questionId === question.id,
          );
          return (
            <fieldset
              className={`quiz-question ${feedback ? (feedback.correct ? "correct-question" : "retry-question") : ""}`}
              key={question.id}
            >
              <legend>
                <span aria-hidden="true">{question.emoji}</span> Challenge{" "}
                {index + 1} ·{" "}
                {question.type === "sound" ? "Similar sounds" : question.type}
              </legend>
              <FrenchAudioText
                text={question.promptFrench}
                label={`French question ${index + 1}`}
              />
              <p>{question.instructionEnglish}</p>
              {question.listenFrench && (
                <button
                  type="button"
                  className="secondary-button listen-challenge"
                  disabled={!speech.supported}
                  onClick={() =>
                    speech.speak(question.listenFrench, {
                      hideText: question.type === "spelling",
                    })
                  }
                >
                  <SpeakerIcon />
                  Listen to the French{" "}
                  {question.type === "spelling" ? "word" : "sound"}
                </button>
              )}
              {question.type === "spelling" ? (
                <>
                  <label className="spelling-label">
                    Your spelling
                    <input
                      type="text"
                      lang="fr-CA"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={500}
                      disabled={loading || Boolean(result)}
                      value={
                        result?.results.find(
                          (r) => r.questionId === question.id,
                        )?.answer ??
                        answers[question.id] ??
                        ""
                      }
                      onChange={(event) =>
                        setAnswers((previous) => ({
                          ...previous,
                          [question.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                  {answers[question.id]?.trim() && !result && (
                    <FrenchAudioText
                      text={answers[question.id]}
                      label="Listen to your spelling answer"
                    />
                  )}
                </>
              ) : (
                <div className="quiz-options">
                  {question.options.map((option, optionIndex) => (
                    <div className="quiz-option" key={option}>
                      <input
                        id={`${quiz.id}-${question.id}-${optionIndex}`}
                        type="radio"
                        name={`${quiz.id}-${question.id}`}
                        aria-label={`Choose ${option}`}
                        disabled={loading || Boolean(result)}
                        checked={
                          (result?.results.find(
                            (r) => r.questionId === question.id,
                          )?.answer ?? answers[question.id]) === option
                        }
                        onChange={() =>
                          setAnswers((previous) => ({
                            ...previous,
                            [question.id]: option,
                          }))
                        }
                      />
                      {question.type === "meaning" ? (
                        <label
                          htmlFor={`${quiz.id}-${question.id}-${optionIndex}`}
                        >
                          {option}
                        </label>
                      ) : (
                        <FrenchPassage text={option} />
                      )}
                    </div>
                  ))}
                </div>
              )}
              {feedback && (
                <div className="quiz-question-feedback">
                  <strong>
                    {feedback.correct
                      ? "🌟 Well done!"
                      : "🌱 Keep growing — try this one again next time."}
                  </strong>
                  {question.type === "meaning" || !feedback.answer.trim() ? (
                    <p>Your answer: {feedback.answer || "No answer"}</p>
                  ) : (
                    <FrenchAudioText
                      text={feedback.answer}
                      label="Your French quiz answer"
                    />
                  )}
                  <p>{feedback.explanationEnglish}</p>
                  <FrenchAudioText
                    text={
                      question.type === "meaning"
                        ? question.promptFrench
                        : feedback.correctAnswer
                    }
                    label={
                      question.type === "meaning"
                        ? "French word to review"
                        : "French answer to review"
                    }
                  />
                  {question.type === "meaning" && (
                    <p>Meaning: {feedback.correctAnswer}</p>
                  )}
                </div>
              )}
            </fieldset>
          );
        })}
        {!result && (
          <button
            className="primary-button"
            type="submit"
            disabled={
              loading || quiz.pack.questions.some((q) => !answers[q.id]?.trim())
            }
          >
            {loading ? "Saving your quiz…" : "Mark my quiz"}
          </button>
        )}
      </form>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {result && (
        <div className="quiz-finish" role="status">
          <span aria-hidden="true">
            {result.mark.percent >= 80 ? "🌟 🎉 🌟" : "🌱 📚 🌱"}
          </span>
          <h4>
            {result.mark.percent >= 80
              ? "Look how much you’re learning!"
              : "Every try helps your brain grow."}
          </h4>
          <MarkBadge mark={result.mark} label="Quiz answers correct" />
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setResult(null);
              setAnswers({});
              setError("");
            }}
          >
            Redo this quiz
          </button>
        </div>
      )}
      {!!attempts.length && (
        <details className="quiz-tries">
          <summary>
            Quiz history · {attempts.length}{" "}
            {attempts.length === 1 ? "try" : "tries"}
          </summary>
          {[...attempts].reverse().map((attempt) => (
            <div key={attempt.id} className="quiz-try">
              <span>{new Date(attempt.createdAt).toLocaleString("en-CA")}</span>
              <MarkBadge mark={attempt.mark} label="Quiz answers correct" />
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setResult(attempt);
                  setAnswers(
                    Object.fromEntries(
                      attempt.results.map((item) => [
                        item.questionId,
                        item.answer,
                      ]),
                    ),
                  );
                  quizStart.current?.scrollIntoView?.({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
              >
                Review this try
              </button>
            </div>
          ))}
        </details>
      )}
      <p className="muted small">
        AI creates these practice questions and explanations. Ask a parent if an
        answer seems surprising.
      </p>
    </section>
  );
}
