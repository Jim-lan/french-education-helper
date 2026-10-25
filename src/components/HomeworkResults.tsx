"use client";
import type { HomeworkAnalysis } from "@/types/homework";
import { FrenchText } from "./FrenchText";
import { WordMeanings } from "./WordMeanings";
import { Pronunciation } from "./Pronunciation";
import { AnswerWorkspace } from "./AnswerWorkspace";
export function HomeworkResults({
  analysis,
  onCorrect,
}: {
  analysis: HomeworkAnalysis;
  onCorrect: () => void;
}) {
  return (
    <Pronunciation>
      <section className="results" aria-labelledby="results-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">LET’S MAKE IT CLEAR</p>
            <h2 id="results-heading">Your homework, explained.</h2>
          </div>
          <span className="result-badge">Ready to read</span>
        </div>
        {analysis.sourceType === "image" && (
          <p className="transcription-note">
            The French below is an AI transcription. The original image above is
            authoritative.{" "}
            <button className="text-button" onClick={onCorrect} type="button">
              Correct the French &amp; analyze again
            </button>
          </p>
        )}
        {analysis.warnings.length > 0 && (
          <aside className="notice" aria-label="Things to check">
            <strong>A little help checking the source</strong>
            {analysis.warnings.map((warning, index) => (
              <p key={index}>
                {warning.message}
                {warning.sourceExcerpt && (
                  <>
                    {" "}
                    <q lang="fr">{warning.sourceExcerpt}</q>
                  </>
                )}
              </p>
            ))}
          </aside>
        )}
        <div className="results-grid">
          <article className="result-panel french-panel">
            <FrenchText analysis={analysis} />
          </article>
          <article className="result-panel english-panel">
            <div className="panel-title">
              <h3>In English</h3>
              <span className="language-tag">EN</span>
            </div>
            <p className="panel-caption">
              A natural translation of the teacher’s words.
            </p>
            <p className="translation">{analysis.englishTranslation}</p>
            <WordMeanings analysis={analysis} />
          </article>
        </div>
        <article className="instruction-panel">
          <div className="instruction-icon" aria-hidden="true">
            ✓
          </div>
          <div>
            <p className="eyebrow">ONE STEP AT A TIME</p>
            <h3>What do I need to do?</h3>
            <p>{analysis.studentExplanation}</p>
            {analysis.steps.length > 0 && (
              <ol>
                {analysis.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            )}
          </div>
        </article>
        <AnswerWorkspace originalFrench={analysis.originalFrench} />
        <p className="muted small">
          AI can make mistakes. Check the original note if something looks
          surprising.
        </p>
      </section>
    </Pronunciation>
  );
}
