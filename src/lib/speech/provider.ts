export interface SpeechOptions {
  locale?: string;
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}
export interface SpeechProvider {
  speak(text: string, options?: SpeechOptions): void;
  stop(): void;
  isSupported(): boolean;
}
