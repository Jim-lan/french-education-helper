import type { SpeechOptions, SpeechProvider } from "./provider";

export function chooseFrenchVoice(
  voices: SpeechSynthesisVoice[],
  locale = "fr-CA",
) {
  return (
    voices.find(
      (voice) =>
        voice.lang.toLowerCase().replace("_", "-") === locale.toLowerCase(),
    ) ??
    voices.find(
      (voice) =>
        /^fr(?:-|_)/i.test(voice.lang) || voice.lang.toLowerCase() === "fr",
    )
  );
}

export class BrowserSpeechProvider implements SpeechProvider {
  private utterance: SpeechSynthesisUtterance | null = null;
  private sequence = 0;
  constructor(
    private readonly engine: SpeechSynthesis,
    private readonly makeUtterance = (text: string) =>
      new SpeechSynthesisUtterance(text),
  ) {}
  isSupported() {
    return true;
  }
  speak(text: string, options: SpeechOptions = {}) {
    this.stop();
    const sequence = this.sequence;
    const utterance = this.makeUtterance(text);
    const voice = chooseFrenchVoice(this.engine.getVoices(), options.locale);
    utterance.lang = voice?.lang || options.locale || "fr-CA";
    if (voice) utterance.voice = voice;
    utterance.rate = options.rate ?? 0.85;
    utterance.onend = () => {
      if (sequence === this.sequence) {
        this.utterance = null;
        options.onEnd?.();
      }
    };
    utterance.onerror = (event) => {
      if (
        sequence === this.sequence &&
        !["interrupted", "canceled"].includes(event.error)
      ) {
        this.utterance = null;
        options.onError?.(
          "Pronunciation couldn't play. Check your device's sound and French voice settings, then try again.",
        );
      }
    };
    this.utterance = utterance; // Keep alive until completion for browser compatibility.
    this.engine.speak(utterance);
  }
  stop() {
    this.sequence++;
    this.engine.cancel();
    this.utterance = null;
  }
}
