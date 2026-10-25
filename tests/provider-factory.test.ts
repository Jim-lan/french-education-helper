import { describe, expect, it } from "vitest";
import { readConfig } from "@/server/config";
import { createProvider } from "@/server/llm/provider-factory";
describe("provider configuration", () => {
  it("requires a Gemini key", () => {
    expect(() => createProvider({})).toThrow("has not been configured");
  });
  it.each(["openai", "xai", "unknown"])(
    "fails explicitly for %s",
    (provider) => {
      expect(() => createProvider({ LLM_PROVIDER: provider })).toThrow(
        "not implemented yet",
      );
    },
  );
  it("selects the configured model without requiring other provider keys", () => {
    const provider = createProvider({
      GEMINI_API_KEY: "test-key",
      LLM_MODEL: "custom-flash",
    });
    expect(provider.id).toBe("gemini");
    expect(provider.model).toBe("custom-flash");
  });
  it("rejects invalid model paths", () => {
    expect(() =>
      readConfig({ GEMINI_API_KEY: "test", LLM_MODEL: "../bad?key=secret" }),
    ).toThrow("model name is invalid");
  });
});
