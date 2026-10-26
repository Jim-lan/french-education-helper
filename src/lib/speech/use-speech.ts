"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SpeechProvider } from "./provider";
import { BrowserSpeechProvider, chooseFrenchVoice } from "./browser-speech";

export function useSpeech() {
  const provider = useRef<SpeechProvider | null>(null);
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [currentText, setCurrentText] = useState("");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState("");
  useEffect(() => {
    if (
      !("speechSynthesis" in window) ||
      !("SpeechSynthesisUtterance" in window)
    ) {
      setNotice(
        "This browser doesn't support pronunciation. Try Safari or Chrome with a French voice installed.",
      );
      return;
    }
    const engine = window.speechSynthesis;
    provider.current = new BrowserSpeechProvider(engine);
    setSupported(true);
    const update = () => {
      const voice = chooseFrenchVoice(engine.getVoices());
      setNotice(
        voice?.lang.toLowerCase().replace("_", "-") === "fr-ca"
          ? "Canadian French voice ready."
          : voice
            ? `Using ${voice.name} (${voice.lang}). Install a Canadian French voice in your device settings to hear fr-CA.`
            : "Requesting Canadian French (fr-CA). Available voices depend on your device's French voice settings.",
      );
    };
    update();
    engine.addEventListener("voiceschanged", update);
    return () => {
      provider.current?.stop();
      provider.current = null;
      engine.removeEventListener("voiceschanged", update);
    };
  }, []);
  const stop = useCallback(() => {
    provider.current?.stop();
    setError("");
    setSpeaking(false);
    setCurrentText("");
    setStarted(false);
    setFinished("");
  }, []);
  const speak = useCallback(
    (text: string, options?: { hideText?: boolean }) => {
      if (!provider.current) return;
      const displayText = options?.hideText
        ? "Spelling word — listen carefully"
        : text;
      setError("");
      setSpeaking(true);
      setCurrentText(displayText);
      setStarted(false);
      setFinished("");
      try {
        provider.current.speak(text, {
          locale: "fr-CA",
          onStart: () => setStarted(true),
          onEnd: () => {
            setSpeaking(false);
            setFinished(displayText);
          },
          onError: (message) => {
            setError(message);
            setSpeaking(false);
          },
        });
      } catch {
        setSpeaking(false);
        setError("Pronunciation couldn't start. Please try again.");
      }
    },
    [],
  );
  return {
    speak,
    stop,
    supported,
    speaking,
    notice,
    error,
    currentText,
    started,
    finished,
  };
}
