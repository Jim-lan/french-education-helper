"use client";
import type { HomeworkAnalysis } from "@/types/homework";
import { tokenizeFrench } from "@/lib/french/segment";
import { useSpeech } from "@/lib/speech/use-speech";
import { FrenchWord } from "./FrenchWord";
import { SentenceSpeaker } from "./SentenceSpeaker";
export function FrenchText({ analysis }: { analysis: HomeworkAnalysis }) {
  const speech = useSpeech();
  // Source gaps stay in the same inline flow; speakers are separate from source text.
  let cursor = 0;
  const parts = analysis.sentences.map((sentence) => {
    const gap = analysis.originalFrench.slice(cursor, sentence.start);
    cursor = sentence.end;
    const tokens = tokenizeFrench(sentence.text);
    return (
      <span key={sentence.start}>
        {gap}
        <span className="french-sentence">
          <span>
            {tokens.map((token, index) => {
              if (token.isWord) {
                const next = tokens[index + 1];
                const suffix =
                  next && !next.isWord
                    ? next.text.match(/^\S+/u)?.[0] || ""
                    : "";
                return (
                  <span className="french-unit" key={token.start}>
                    <FrenchWord
                      text={token.text}
                      disabled={!speech.supported}
                      onHear={speech.speak}
                    />
                    {suffix}
                  </span>
                );
              }
              return (
                <span key={token.start}>
                  {tokens[index - 1]?.isWord
                    ? token.text.replace(/^\S+/u, "")
                    : token.text}
                </span>
              );
            })}
          </span>
          <SentenceSpeaker
            text={sentence.text}
            disabled={!speech.supported}
            onHear={speech.speak}
          />
        </span>
      </span>
    );
  });
  return (
    <>
      <div className="panel-title">
        <h3>
          {analysis.sourceType === "image"
            ? "The French, transcribed"
            : "The original French"}
        </h3>
        <span className="language-tag" lang="fr">
          FR
        </span>
      </div>
      <p className="panel-caption">
        Tap a word to hear it. Use a speaker for the sentence.
      </p>
      <div lang="fr-CA" className="french-source">
        {parts}
        {analysis.originalFrench.slice(cursor)}
      </div>
      <div className="speech-status">
        <span>{speech.error || speech.notice}</span>
        <button
          className="text-button"
          type="button"
          onClick={speech.stop}
          disabled={!speech.speaking}
        >
          Stop audio
        </button>
      </div>
    </>
  );
}
