import "server-only";
import { readConfig } from "@/server/config";
import { GeminiProvider } from "./providers/gemini";
import type { LLMProvider } from "./types";
export function createProvider(
  env: Readonly<Record<string, string | undefined>> = process.env,
): LLMProvider {
  const config = readConfig(env);
  return new GeminiProvider(config.model, config.apiKey);
}
