import { describe, expect, it } from "vitest";
import { getWordGlossary, normalizeWordMeanings } from "@/lib/french/meanings";

describe("source-grounded word meanings", () => {
  it("keeps source order and spelling, and shows repeated words once", () => {
    expect(
      getWordGlossary("Lis le texte. Lis le livre.", [
        { french: "lis", english: "read" },
        { french: "le", english: "the" },
        { french: "texte", english: "text" },
        { french: "livre", english: "book" },
      ]),
    ).toEqual([
      { french: "Lis", english: "read" },
      { french: "le", english: "the" },
      { french: "texte", english: "text" },
      { french: "livre", english: "book" },
    ]);
  });
  it("matches apostrophe variants and Unicode accents without conflating ou and où", () => {
    expect(
      getWordGlossary("J’aime l'école ou où e\u0301cole", [
        { french: "j'aime", english: "I like" },
        { french: "l’école", english: "the school" },
        { french: "ou", english: "or" },
        { french: "où", english: "where" },
        { french: "école", english: "school" },
      ]).map((word) => word.english),
    ).toEqual(["I like", "the school", "or", "where", "school"]);
  });
  it("marks missing meanings without inventing them and preserves numbers", () => {
    expect(
      getWordGlossary("Lis 3 phrases.", [{ french: "Lis", english: "read" }]),
    ).toEqual([
      { french: "Lis", english: "read" },
      { french: "3", english: "3" },
      { french: "phrases", english: null },
    ]);
  });
  it("drops invented words, contraction fragments, blanks, and duplicates", () => {
    expect(
      normalizeWordMeanings("L’école", [
        { french: "école", english: "school" },
        { french: "l’école", english: "the school" },
        { french: "l'école", english: "duplicate" },
        { french: "chat", english: "cat" },
        { french: "L’école", english: " " },
      ]),
    ).toEqual([{ french: "L’école", english: "the school" }]);
  });
});
