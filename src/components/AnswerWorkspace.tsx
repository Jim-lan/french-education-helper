"use client";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ReviewResponseSchema, type AnswerReview } from "@/lib/homework/review";
import { FrenchAudioText } from "./FrenchAudioText";

function Feedback({ review }: { review: AnswerReview }) {
  return (
    <div className={`answer-feedback ${review.status}`}>
      <h4>
        {review.status === "passed"
          ? "Nice work — task complete!"
          : review.status === "needs_work"
            ? "A little more practice"
            : "Let's check with a parent"}
      </h4>
      <p role="status">{review.summaryEnglish}</p>
      {review.requirements.length > 0 && (
        <ul className="requirements">
          {review.requirements.map((item, index) => (
            <li key={index}>
              <span
                className={item.met ? "requirement-met" : "requirement-missed"}
              >
                {item.met ? "✓ Met" : "Try again"}
              </span>
              <div>
                <strong>{item.requirementEnglish}</strong>
                <p>{item.feedbackEnglish}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {review.strengths.length > 0 && (
        <>
          <h5>What went well</h5>
          <ul>
            {review.strengths.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </>
      )}
      {review.improvements.length > 0 && (
        <>
          <h5>Your next step</h5>
          <ul>
            {review.improvements.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </>
      )}
      {review.frenchExamples?.length > 0 && (
        <section
          className="french-examples"
          aria-label="French examples to learn from"
        >
          <h5>Examples to learn from</h5>
          {review.frenchExamples.map((example, index) => (
            <div key={index}>
              <FrenchAudioText
                text={example.french}
                label={`French example ${index + 1}`}
                readLabel="Read this example in French"
              />
              <p>{example.english}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function AnswerAttempt({
  originalFrench,
  practice = false,
}: {
  originalFrench: string;
  practice?: boolean;
}) {
  const id = useId();
  const [answer, setAnswer] = useState("");
  const [review, setReview] = useState<AnswerReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function check(event: FormEvent) {
    event.preventDefault();
    if (loading || !answer.trim()) return;
    const current = new AbortController();
    controller.current = current;
    const timer = setTimeout(() => current.abort(), 80000);
    setLoading(true);
    setError("");
    setReview(null);
    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalFrench, answer }),
        signal: current.signal,
      });
      const result = ReviewResponseSchema.safeParse(await response.json());
      if (!result.success)
        throw new Error("The feedback couldn't be read. Please try again.");
      if (!result.data.ok) throw new Error(result.data.error.message);
      if (!response.ok)
        throw new Error("The answer couldn't be checked. Please try again.");
      if (controller.current === current) setReview(result.data.data);
    } catch (failure) {
      if (controller.current === current)
        setError(
          current.signal.aborted
            ? "That took too long. Please try again."
            : failure instanceof Error && !(failure instanceof TypeError)
              ? failure.message
              : "We couldn't connect. Please try again.",
        );
    } finally {
      clearTimeout(timer);
      if (controller.current === current) {
        controller.current = null;
        setLoading(false);
      }
    }
  }
  function cancel() {
    const pending = controller.current;
    controller.current = null;
    pending?.abort();
    setLoading(false);
  }
  return (
    <div className="answer-attempt">
      <form onSubmit={check}>
        <label htmlFor={id}>
          {practice ? "Your practice answer" : "Your French answer"}
        </label>
        <textarea
          id={id}
          lang="fr-CA"
          spellCheck
          value={answer}
          maxLength={10000}
          disabled={loading}
          rows={practice ? 3 : 5}
          placeholder={
            practice
              ? "Try the practice task in French…"
              : "Write your answer in French. For sentence-writing tasks, put each sentence on its own line."
          }
          onChange={(event) => {
            setAnswer(event.target.value);
            setReview(null);
            setError("");
          }}
        />
        <FrenchAudioText
          text={answer}
          label={
            practice
              ? "Listen to your practice answer"
              : "Listen to your answer"
          }
          readLabel={
            practice
              ? "Read my practice answer in French"
              : "Read my answer in French"
          }
        />
        <div className="form-actions">
          <button
            className="primary-button"
            type="submit"
            disabled={loading || !answer.trim()}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Checking your answer…
              </>
            ) : practice ? (
              "Check practice answer"
            ) : (
              "Check my answer"
            )}
          </button>
          {loading && (
            <button className="text-button" type="button" onClick={cancel}>
              Cancel answer check
            </button>
          )}
        </div>
        <p className="privacy-note">
          Your answer is sent to the configured AI provider only when you choose
          Check. Editing or listening does not submit it.
        </p>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
      </form>
      {review && <Feedback review={review} />}
      {review?.status === "passed" && (
        <p className="completion-message">
          {practice
            ? "Practice complete! Now revise your original homework answer above and check it again."
            : "You have finished the basic task. Spelling and similar-sound games are planned for the next stage."}
        </p>
      )}
      {!practice && review?.status === "needs_work" && review.practice && (
        <section
          className="targeted-practice"
          aria-label="Practice just for you"
        >
          <p className="eyebrow">A SMALL STEP TO HELP YOU IMPROVE</p>
          <h4>Practice just for you</h4>
          <FrenchAudioText
            text={review.practice.instructionFrench}
            label="Listen to the practice question"
            readLabel="Read the practice question in French"
          />
          <p>{review.practice.instructionEnglish}</p>
          <details className="practice-hint">
            <summary>Need a hint?</summary>
            <p>{review.practice.hintEnglish}</p>
          </details>
          <AnswerAttempt
            key={review.practice.instructionFrench}
            originalFrench={review.practice.instructionFrench}
            practice
          />
        </section>
      )}
    </div>
  );
}
export function AnswerWorkspace({
  originalFrench,
}: {
  originalFrench: string;
}) {
  return (
    <section className="answer-workspace" aria-labelledby="answer-heading">
      <p className="eyebrow">TRY THE TEACHER’S TASK FIRST</p>
      <h3 id="answer-heading">Your turn</h3>
      <p className="muted small">
        When the note asks for a written answer, try it here. We'll check the
        teacher’s requirements and help you improve. A parent can review the
        feedback with you.
      </p>
      <AnswerAttempt key={originalFrench} originalFrench={originalFrench} />
    </section>
  );
}
