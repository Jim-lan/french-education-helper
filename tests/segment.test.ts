import { describe, expect, it } from "vitest";
import { segmentFrench, tokenizeFrench } from "@/lib/french/segment";
describe("French source segmentation", () => {
  it.each([
    "À l'école, j'aime le ballon !",
    "C’est aujourd’hui : peut-être.\nÉcris trois phrases.",
    "  été\r\nchat\r\nballon  ",
    "👋 Lis e\u0301cole.",
  ])("preserves every character in %s", (text) => {
    const tokens = tokenizeFrench(text);
    expect(tokens.map((token) => token.text).join("")).toBe(text);
    for (const token of tokens)
      expect(text.slice(token.start, token.end)).toBe(token.text);
  });
  it("keeps contractions and compounds together", () => {
    expect(
      tokenizeFrench("l'école j'aime c’est aujourd'hui peut-être")
        .filter((t) => t.isWord)
        .map((t) => t.text),
    ).toEqual(["l'école", "j'aime", "c’est", "aujourd'hui", "peut-être"]);
  });
  it.each([true, false])(
    "preserves offsets for sentences and lists (Intl: %s)",
    (intl) => {
      const text = "  Lis ceci. Écris trois phrases !\r\nballon\nchat  ";
      const sentences = segmentFrench(text, intl);
      expect(sentences.map((s) => s.text)).toEqual([
        "Lis ceci.",
        "Écris trois phrases !",
        "ballon",
        "chat",
      ]);
      for (const sentence of sentences)
        expect(text.slice(sentence.start, sentence.end)).toBe(sentence.text);
    },
  );
});
