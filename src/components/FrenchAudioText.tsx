"use client";
import { FrenchPassage } from "./FrenchPassage";
import { usePronunciation } from "./Pronunciation";
import { SpeakerIcon } from "./Icons";

/** Use for French answers, prompts, examples, and future quiz text. No network I/O. */
export function FrenchAudioText({
  text,
  label,
  readLabel = "Read all in French",
}: {
  text: string;
  label: string;
  readLabel?: string;
}) {
  const speech = usePronunciation();
  if (!text.trim()) return null;
  return (
    <section className="french-audio-text" aria-label={label}>
      <div className="audio-text-heading">
        <strong>{label}</strong>
        <div className="audio-text-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={!speech.supported}
            onClick={() => speech.speak(text)}
          >
            <SpeakerIcon />
            {readLabel}
          </button>
          <button
            type="button"
            className="text-button"
            disabled={!speech.speaking}
            onClick={speech.stop}
          >
            Stop
          </button>
        </div>
      </div>
      <p className="panel-caption">
        Tap any word to hear it. Each sentence has its own speaker.
      </p>
      <FrenchPassage text={text} />
    </section>
  );
}
