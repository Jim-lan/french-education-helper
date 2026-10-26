"use client";
import type { AnswerReview } from "@/lib/homework/review";
import { reviewMark } from "@/lib/learning/types";
import { MarkBadge } from "./MarkBadge";
import { FrenchAudioText } from "./FrenchAudioText";
export function Feedback({ review }: { review: AnswerReview }) {
  return (
    <div className={`answer-feedback ${review.status}`}>
      <h4>
        {review.status === "passed"
          ? "Nice work — task complete!"
          : review.status === "needs_work"
            ? "A little more practice"
            : "Let's check with a parent"}
      </h4>
      <MarkBadge mark={reviewMark(review)} />
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
