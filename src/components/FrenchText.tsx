"use client";
import type { HomeworkAnalysis } from "@/types/homework";
import { usePronunciation } from "./Pronunciation";
import { FrenchPassage } from "./FrenchPassage";
export function FrenchText({ analysis }: { analysis: HomeworkAnalysis }) {
  const speech = usePronunciation();
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
      <button
        className="secondary-button read-french"
        type="button"
        disabled={!speech.supported}
        onClick={() => speech.speak(analysis.originalFrench)}
      >
        Read the whole note in French
      </button>
      <FrenchPassage
        text={analysis.originalFrench}
        sentences={analysis.sentences}
      />
      <div className="speech-status">
        <span>
          {speech.error ||
            (speech.speaking
              ? `${speech.started ? "Playing French" : "Starting French audio"}: ${speech.currentText}`
              : speech.finished
                ? `Finished French audio: ${speech.finished}`
                : speech.notice)}
        </span>
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
