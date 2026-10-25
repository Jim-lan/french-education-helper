import { describe, expect, it } from "vitest";
import {
  AnalysisContentSchema,
  HomeworkAnalysisSchema,
} from "@/lib/homework/schema";
import { segmentFrench } from "@/lib/french/segment";
import { content } from "./fixtures/analysis";
describe("application response schema", () => {
  it("rejects sentence endpoints beyond the source length", () => {
    const text = content.originalFrench;
    expect(HomeworkAnalysisSchema.safeParse({
      ...content, schemaVersion: "1", sourceType: "text",
      sentences: [{ text, start: 0, end: text.length + 1 }],
    }).success).toBe(false);
  });
  const analysis = {
    ...content,
    schemaVersion: "1",
    sourceType: "text",
    sentences: segmentFrench(content.originalFrench),
  };
  it("accepts complete normalized responses and exact sentence spans", () => {
    expect(HomeworkAnalysisSchema.safeParse(analysis).success).toBe(true);
  });
  it.each([
    {},
    { ...content, englishTranslation: "" },
    { ...content, steps: "do work" },
    { ...content, html: "<p>hi</p>" },
    { ...content, warnings: [{ code: "FAKE", message: "unclear" }] },
  ])("rejects malformed content %#", (value) => {
    expect(AnalysisContentSchema.safeParse(value).success).toBe(false);
  });
  it("rejects invented and overlapping sentence spans", () => {
    expect(
      HomeworkAnalysisSchema.safeParse({
        ...analysis,
        sentences: [{ text: "wrong", start: 0, end: 5 }],
      }).success,
    ).toBe(false);
    expect(
      HomeworkAnalysisSchema.safeParse({
        ...analysis,
        sentences: [analysis.sentences[0], analysis.sentences[0]],
      }).success,
    ).toBe(false);
  });
});
