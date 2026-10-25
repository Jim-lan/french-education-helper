import "server-only";
import { AppError } from "./errors";
export function readConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
) {
  const provider = (env.LLM_PROVIDER || "gemini").trim().toLowerCase();
  if (provider !== "gemini")
    throw new AppError(
      "UNSUPPORTED_PROVIDER",
      `${provider === "openai" ? "OpenAI" : provider === "xai" ? "xAI/Grok" : "This provider"} is not implemented yet. Select Gemini for V1.`,
      503,
    );
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey)
    throw new AppError(
      "PROVIDER_NOT_CONFIGURED",
      "Gemini is selected but has not been configured. Ask a parent to add GEMINI_API_KEY to .env.local and restart the app.",
      503,
    );
  const model = (env.LLM_MODEL || "gemini-3.5-flash-lite").trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/.test(model))
    throw new AppError(
      "INVALID_CONFIGURATION",
      "The configured model name is invalid. Check LLM_MODEL.",
      503,
    );
  return { provider: "gemini" as const, model, apiKey };
}
