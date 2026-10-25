"use client";
import { createContext, useContext, type ReactNode } from "react";
import { useSpeech } from "@/lib/speech/use-speech";
const SpeechContext = createContext<ReturnType<typeof useSpeech> | null>(null);
export function Pronunciation({ children }: { children: ReactNode }) {
  const speech = useSpeech();
  return (
    <SpeechContext.Provider value={speech}>
      {children}
      {(speech.speaking || speech.error) && (
        <aside className="speech-player" aria-label="French audio player">
          <p role="status" aria-live="polite">
            {speech.error ||
              `${speech.started ? "Playing French" : "Starting French audio"}: ${speech.currentText}`}
          </p>
          <button className="text-button" type="button" onClick={speech.stop}>
            {speech.speaking ? "Stop French audio" : "Dismiss audio message"}
          </button>
        </aside>
      )}
    </SpeechContext.Provider>
  );
}
export function usePronunciation() {
  const speech = useContext(SpeechContext);
  if (!speech)
    throw new Error("Pronunciation controls require a shared speech provider.");
  return speech;
}
