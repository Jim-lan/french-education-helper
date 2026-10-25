export interface FrenchToken {
  text: string;
  start: number;
  end: number;
  isWord: boolean;
}

/** Preserve every source character, including gaps, elisions and compounds. */
export function tokenizeFrench(text: string): FrenchToken[] {
  const pattern = /[\p{L}\p{M}\p{N}]+(?:['’\-‐‑][\p{L}\p{M}\p{N}]+)*/gu;
  const tokens: FrenchToken[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    if (cursor < start)
      tokens.push({
        text: text.slice(cursor, start),
        start: cursor,
        end: start,
        isWord: false,
      });
    cursor = start + match[0].length;
    tokens.push({ text: match[0], start, end: cursor, isWord: true });
  }
  if (cursor < text.length)
    tokens.push({
      text: text.slice(cursor),
      start: cursor,
      end: text.length,
      isWord: false,
    });
  return tokens;
}
export function segmentFrench(text: string, useIntl = true) {
  const sentences: { text: string; start: number; end: number }[] = [];
  for (const line of text.matchAll(/[^\r\n]+/g)) {
    const segments =
      useIntl && typeof Intl.Segmenter === "function"
        ? [
            ...new Intl.Segmenter("fr-CA", { granularity: "sentence" }).segment(
              line[0],
            ),
          ].map((part) => ({ segment: part.segment, index: part.index }))
        : [...line[0].matchAll(/[^.!?]+(?:[.!?]+[»”"']*)?|[.!?]+/g)].map(
            (part) => ({ segment: part[0], index: part.index }),
          );
    for (const part of segments) {
      const value = part.segment.trim();
      if (!value) continue;
      const start =
        line.index +
        part.index +
        part.segment.length -
        part.segment.trimStart().length;
      sentences.push({ text: value, start, end: start + value.length });
    }
  }
  return sentences;
}
