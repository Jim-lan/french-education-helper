"use client";
export function FrenchWord({
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
      className="french-word"
      disabled={disabled}
      onClick={() => onHear(text)}
      aria-label={`Hear ${text}`}
      title={`Hear “${text}”`}
    >
      {text}
    </button>
  );
}
