// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomeworkHelper } from "@/components/HomeworkHelper";
import { segmentFrench } from "@/lib/french/segment";
import { content } from "./fixtures/analysis";
const result = (sourceType = "text", text = content.originalFrench) => ({
  ok: true,
  data: {
    ...content,
    originalFrench: text,
    schemaVersion: "1",
    sourceType,
    sentences: segmentFrench(text),
  },
});
let fetcher: ReturnType<typeof vi.fn>;
let speak: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetcher = vi.fn();
  speak = vi.fn();
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
  HTMLElement.prototype.scrollIntoView = vi.fn();
  URL.createObjectURL = vi.fn(() => "blob:synthetic-homework");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("homework UI with synthetic responses", () => {
  it("renders analysis and pronounces a word and sentence without more API calls", async () => {
    const user = userEvent.setup();
    fetcher.mockResolvedValue({ ok: true, json: async () => result() });
    render(<HomeworkHelper />);
    fireEvent.change(screen.getByLabelText("The teacher’s French"), {
      target: { value: content.originalFrench },
    });
    await user.click(
      screen.getByRole("button", { name: /Help me understand/ }),
    );
    expect(await screen.findByText(content.englishTranslation)).toBeTruthy();
    expect(screen.getByText(content.studentExplanation)).toBeTruthy();
    expect(screen.getByText("Word meanings")).toBeTruthy();
    expect(screen.getByText("text / passage")).toBeTruthy();
    expect(document.querySelector(".french-source")?.textContent).toBe(
      content.originalFrench,
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      text: content.originalFrench,
    });
    await user.click(screen.getByRole("button", { name: "Hear Lis" }));
    await user.click(
      screen.getByRole("button", {
        name: "Hear sentence: Lis le texte deux fois.",
      }),
    );
    expect(speak).toHaveBeenCalledTimes(2);
    expect(speak.mock.calls[0][0]).toMatchObject({
      text: "Lis",
      lang: "fr-CA",
    });
    expect(fetcher).toHaveBeenCalledOnce();
    await user.click(screen.getByText("Word meanings"));
    expect(
      document.querySelector("details.word-meanings")?.hasAttribute("open"),
    ).toBe(false);
    await user.click(screen.getByText("Word meanings"));
    expect(
      document.querySelector("details.word-meanings")?.hasAttribute("open"),
    ).toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("keeps the original image visible and supports correction using the text path", async () => {
    const user = userEvent.setup();
    fetcher.mockResolvedValue({ ok: true, json: async () => result("image") });
    render(<HomeworkHelper />);
    await user.click(screen.getByRole("button", { name: /Upload a photo/ }));
    const file = new File(["synthetic-image"], "teacher-note.png", {
      type: "image/png",
    });
    await user.upload(screen.getByLabelText(/Choose a homework photo/), file);
    expect(
      await screen.findByAltText(/Original uploaded homework/),
    ).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: /Help me understand/ }),
    );
    expect(await screen.findByText("The French, transcribed")).toBeTruthy();
    expect(screen.getByText("text / passage")).toBeTruthy();
    expect(screen.getByAltText(/Original uploaded homework/)).toBeTruthy();
    expect(fetcher.mock.calls[0][1].body.get("image").name).toBe(
      "teacher-note.png",
    );
    await user.click(
      screen.getByRole("button", { name: /Correct the French/ }),
    );
    expect(
      (screen.getByLabelText("The teacher’s French") as HTMLTextAreaElement)
        .value,
    ).toBe(content.originalFrench);
    expect(screen.getByAltText(/Original uploaded homework/)).toBeTruthy();
  });
  it("shows safe provider errors and allows retry", async () => {
    const user = userEvent.setup();
    fetcher.mockResolvedValue({
      ok: false,
      json: async () => ({
        ok: false,
        error: {
          code: "PROVIDER_NOT_CONFIGURED",
          message: "Gemini is not configured.",
        },
      }),
    });
    render(<HomeworkHelper />);
    await user.click(screen.getByRole("button", { name: /Try this note/ }));
    await user.click(
      screen.getByRole("button", { name: /Help me understand/ }),
    );
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("Gemini is not configured."),
    );
    expect(
      (
        screen.getByRole("button", {
          name: /Help me understand/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
  it("cancels loading and prevents a late result from replacing a new input", async () => {
    const user = userEvent.setup();
    let complete!: (value: unknown) => void;
    fetcher.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    render(<HomeworkHelper />);
    await user.click(screen.getByRole("button", { name: /Try this note/ }));
    await user.click(
      screen.getByRole("button", { name: /Help me understand/ }),
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    complete({ ok: true, json: async () => result() });
    await waitFor(() =>
      expect(screen.queryByText("Your homework, explained.")).toBeNull(),
    );
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
