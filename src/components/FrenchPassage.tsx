"use client";
import { tokenizeFrench, segmentFrench } from "@/lib/french/segment";
import { usePronunciation } from "./Pronunciation";
import { FrenchWord } from "./FrenchWord";
import { SentenceSpeaker } from "./SentenceSpeaker";
export function FrenchPassage({
  text,
  sentences = segmentFrench(text),
}: {
  text: string;
  sentences?: { text: string; start: number; end: number }[];
}) {
  const speech = usePronunciation();
  let cursor = 0;
  const parts = sentences.map((sentence) => {
    const gap = text.slice(cursor, sentence.start);
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
    <div lang="fr-CA" className="french-source">
      {parts}
      {text.slice(cursor)}
    </div>
  );
}
