// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pronunciation } from "@/components/Pronunciation";
import { FrenchAudioText } from "@/components/FrenchAudioText";
import { HomeworkResults } from "@/components/HomeworkResults";
import { content } from "./fixtures/analysis";
import { needsWorkReview, teacherTask } from "./fixtures/review";
import { segmentFrench } from "@/lib/french/segment";
let speak: ReturnType<typeof vi.fn>;
let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => {
  speak = vi.fn();
  fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  vi.stubGlobal("speechSynthesis", {
    getVoices: () => [{ name: "Canadian French", lang: "fr-CA" }],
    speak,
    cancel: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("French audio across the learning workflow", () => {
  it.each(["Answer", "Quiz prompt", "Generated sample", "Enhanced sentence"])(
    "offers word, sentence, and full reading for %s without network requests",
    async (label) => {
      const user = userEvent.setup();
      const text = "J’aime mon ballon. Il est bleu.";
      render(
        <Pronunciation>
          <FrenchAudioText label={label} text={text} />
        </Pronunciation>,
      );
      const region = within(screen.getByRole("region", { name: label }));
      await user.click(region.getByRole("button", { name: "Hear J’aime" }));
      await user.click(
        region.getByRole("button", {
          name: "Hear sentence: J’aime mon ballon.",
        }),
      );
      await user.click(
        region.getByRole("button", { name: "Read all in French" }),
      );
      expect(speak.mock.calls.map((call) => call[0].text)).toEqual([
        "J’aime",
        "J’aime mon ballon.",
        text,
      ]);
      for (const [utterance] of speak.mock.calls)
        expect(utterance.lang).toBe("fr-CA");
      expect(fetcher).not.toHaveBeenCalled();
      await user.click(
        screen.getByRole("button", { name: "Stop French audio" }),
      );
      expect(
        screen.queryByRole("complementary", { name: "French audio player" }),
      ).toBeNull();
    },
  );
  it("pronounces draft answers, practice questions/answers, and generated examples without extra review calls", async () => {
    const user = userEvent.setup();
    fetcher.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: needsWorkReview }),
    });
    render(
      <HomeworkResults
        analysis={{
          ...content,
          originalFrench: teacherTask,
          schemaVersion: "1",
          sourceType: "text",
          sentences: segmentFrench(teacherTask),
        }}
        onCorrect={() => {}}
      />,
    );
    const answer = "J’aime mon ballon.";
    fireEvent.change(screen.getByLabelText("Your French answer"), {
      target: { value: answer },
    });
    let draft = within(
      screen.getByRole("region", { name: "Listen to your answer" }),
    );
    await user.click(draft.getByRole("button", { name: "Hear ballon" }));
    await user.click(
      draft.getByRole("button", { name: "Hear sentence: J’aime mon ballon." }),
    );
    await user.click(
      draft.getByRole("button", { name: "Read my answer in French" }),
    );
    expect(fetcher).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Check my answer" }));
    const generated = within(
      await screen.findByRole("region", { name: "French example 1" }),
    );
    await user.click(generated.getByRole("button", { name: "Hear bleu" }));
    await user.click(
      generated.getByRole("button", { name: "Read this example in French" }),
    );
    const practice = within(
      screen.getByRole("region", { name: "Listen to the practice question" }),
    );
    await user.click(
      practice.getByRole("button", {
        name: "Read the practice question in French",
      }),
    );
    fireEvent.change(screen.getByLabelText("Your practice answer"), {
      target: { value: "Mon ballon est bleu." },
    });
    const practiceAnswer = within(
      screen.getByRole("region", { name: "Listen to your practice answer" }),
    );
    await user.click(
      practiceAnswer.getByRole("button", {
        name: "Hear sentence: Mon ballon est bleu.",
      }),
    );
    await user.click(
      practiceAnswer.getByRole("button", {
        name: "Read my practice answer in French",
      }),
    );
    expect(fetcher).toHaveBeenCalledOnce();
    expect(speak.mock.calls.map((call) => call[0].text)).toEqual([
      "ballon",
      answer,
      answer,
      "bleu",
      "Le ballon est bleu.",
      needsWorkReview.practice!.instructionFrench,
      "Mon ballon est bleu.",
      "Mon ballon est bleu.",
    ]);
    fireEvent.change(screen.getByLabelText("Your French answer"), {
      target: { value: "J’aime l’école." },
    });
    draft = within(
      screen.getByRole("region", { name: "Listen to your answer" }),
    );
    expect(draft.queryByRole("button", { name: "Hear ballon" })).toBeNull();
    expect(draft.getByRole("button", { name: "Hear l’école" })).toBeTruthy();
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
