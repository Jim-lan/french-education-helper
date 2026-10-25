import { getWordGlossary } from "@/lib/french/meanings";
import type { HomeworkAnalysis } from "@/types/homework";

export function WordMeanings({ analysis }: { analysis: HomeworkAnalysis }) {
  const words = getWordGlossary(analysis.originalFrench, analysis.wordMeanings);
  if (!words.length) return null;
  return (
    <details className="word-meanings" open>
      <summary>
        Word meanings{" "}
        <span className="word-count">
          {words.length} {words.length === 1 ? "word" : "words"}
        </span>
      </summary>
      <p className="panel-caption">
        Short meanings for this note. A word can mean something different in
        another sentence.
      </p>
      {!analysis.wordMeanings.length && (
        <p className="meaning-note">
          Analyze the note again to get word meanings.
        </p>
      )}
      <dl className="word-meanings-list">
        {words.map((word, index) => (
          <div className="word-meaning-row" key={index}>
            <dt lang="fr-CA">{word.french}</dt>
            <dd>
              {word.english ?? (
                <span className="meaning-unavailable">Not available</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
