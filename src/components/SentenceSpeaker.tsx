"use client";
import { SpeakerIcon } from "./Icons";
export function SentenceSpeaker({
  text,
  disabled,
  onHear,
}: {
  text: string;
  disabled: boolean;
  onHear: (text: string) => void;
}) {
  return (
    <button
      type="button"
      className="sentence-speaker"
      disabled={disabled}
      onClick={() => onHear(text)}
      aria-label={`Hear sentence: ${text}`}
      title="Hear this sentence"
    >
      <SpeakerIcon />
    </button>
  );
}
