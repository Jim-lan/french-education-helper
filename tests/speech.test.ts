import { describe, expect, it, vi } from "vitest";
import {
  BrowserSpeechProvider,
  chooseFrenchVoice,
} from "@/lib/speech/browser-speech";
const voice = (lang: string) => ({ lang, name: lang }) as SpeechSynthesisVoice;
describe("independent browser pronunciation", () => {
  it("prefers Canadian French then French and never selects English explicitly", () => {
    expect(
      chooseFrenchVoice([voice("en-US"), voice("fr-FR"), voice("fr-CA")])?.lang,
    ).toBe("fr-CA");
    expect(chooseFrenchVoice([voice("en-US"), voice("fr-FR")])?.lang).toBe(
      "fr-FR",
    );
    expect(chooseFrenchVoice([voice("en-US")])).toBeUndefined();
  });
  it("speaks words and complete sentences on demand and cancels previous audio", () => {
    const utterances: SpeechSynthesisUtterance[] = [];
    const engine = {
      getVoices: () => [voice("fr-CA")],
      cancel: vi.fn(),
      speak: vi.fn(),
    };
    const make = (text: string) => {
      const u = { text } as SpeechSynthesisUtterance;
      utterances.push(u);
      return u;
    };
    const provider = new BrowserSpeechProvider(
      engine as unknown as SpeechSynthesis,
      make,
    );
    provider.speak("l'école");
    provider.speak("Écris trois phrases.");
    expect(utterances.map((u) => u.text)).toEqual([
      "l'école",
      "Écris trois phrases.",
    ]);
    expect(utterances[1].lang).toBe("fr-CA");
    expect(engine.speak).toHaveBeenCalledTimes(2);
    expect(engine.cancel).toHaveBeenCalledTimes(2);
    provider.stop();
    expect(engine.cancel).toHaveBeenCalledTimes(3);
  });
  it("ignores completion callbacks from cancelled utterances", () => {
    const utterances: SpeechSynthesisUtterance[] = [];
    const onEnd = vi.fn();
    const engine = { getVoices: () => [], cancel: vi.fn(), speak: vi.fn() };
    const provider = new BrowserSpeechProvider(
      engine as unknown as SpeechSynthesis,
      (text) => {
        const u = { text } as SpeechSynthesisUtterance;
        utterances.push(u);
        return u;
      },
    );
    provider.speak("ballon", { onEnd });
    provider.speak("chat", { onEnd });
    utterances[0].onend?.({} as SpeechSynthesisEvent);
    expect(onEnd).not.toHaveBeenCalled();
    utterances[1].onend?.({} as SpeechSynthesisEvent);
    expect(onEnd).toHaveBeenCalledOnce();
    expect(utterances[1].lang).toBe("fr-CA");
  });
});
