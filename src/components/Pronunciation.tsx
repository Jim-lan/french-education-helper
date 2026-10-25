"use client";
import { createContext, useContext, type ReactNode } from "react";
import { useSpeech } from "@/lib/speech/use-speech";
const SpeechContext = createContext<ReturnType<typeof useSpeech> | null>(null);
export function Pronunciation({ children }: { children: ReactNode }) {
  return (
    <SpeechContext.Provider value={useSpeech()}>
      {children}
    </SpeechContext.Provider>
  );
}
export function usePronunciation() {
  const speech = useContext(SpeechContext);
  if (!speech)
    throw new Error("Pronunciation controls require a shared speech provider.");
  return speech;
}
