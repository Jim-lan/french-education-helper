import { tokenizeFrench } from "./segment";

export interface WordMeaning {
  french: string;
  english: string;
}

function wordKey(word: string) {
  return word
    .normalize("NFC")
    .toLocaleLowerCase("fr-CA")
    .replace(/[’ʼ]/gu, "'")
    .replace(/[‐‑]/gu, "-");
}

/** Keep the teacher's spelling/order and distinguish accented words such as ou/où. */
export function getWordGlossary(source: string, meanings: WordMeaning[]) {
  const dictionary = new Map<string, string>();
  for (const entry of meanings) {
    const key = wordKey(entry.french);
    if (!dictionary.has(key) && entry.english.trim())
      dictionary.set(key, entry.english.trim());
  }
  const words = new Map<string, { french: string; english: string | null }>();
  for (const token of tokenizeFrench(source)) {
    if (!token.isWord) continue;
    const key = wordKey(token.text);
    if (words.has(key)) continue;
    words.set(key, {
      french: token.text,
      english:
        dictionary.get(key) ??
        (/^\p{N}+$/u.test(token.text) ? token.text : null),
    });
  }
  return [...words.values()];
}

/** Do not include definitions for invented words or detached contraction fragments. */
export function normalizeWordMeanings(
  source: string,
  meanings: WordMeaning[],
): WordMeaning[] {
  return getWordGlossary(source, meanings)
    .filter((entry): entry is WordMeaning => entry.english !== null)
    .slice(0, 500);
}
