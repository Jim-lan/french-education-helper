// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomeworkResults } from "@/components/HomeworkResults";
import { content } from "./fixtures/analysis";
import { passedReview, needsWorkReview, teacherTask } from "./fixtures/review";
import { segmentFrench } from "@/lib/french/segment";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const analysis = {
  ...content,
  originalFrench: teacherTask,
  schemaVersion: "1" as const,
  sourceType: "text" as const,
  sentences: segmentFrench(teacherTask),
};
describe("finish the original task before expansion", () => {
  it("checks only on submission, offers targeted practice, and rechecks the original answer", async () => {
    const user = userEvent.setup();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: needsWorkReview }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: passedReview }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, data: passedReview }),
      });
    vi.stubGlobal("fetch", fetcher);
    render(<HomeworkResults analysis={analysis} onCorrect={() => {}} />);
    fireEvent.change(screen.getByLabelText("Your French answer"), {
      target: { value: "J’aime mon ballon." },
    });
    expect(fetcher).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(
      await screen.findByRole("heading", { name: "Practice just for you" }),
    ).toBeTruthy();
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      originalFrench: teacherTask,
      answer: "J’aime mon ballon.",
    });
    fireEvent.change(screen.getByLabelText("Your practice answer"), {
      target: { value: "Je joue avec mon ballon." },
    });
    await user.click(
      screen.getByRole("button", { name: "Check practice answer" }),
    );
    expect(
      await screen.findByText(/Practice complete! Now revise/),
    ).toBeTruthy();
    expect(screen.queryByText(/You have finished the basic task/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Your French answer"), {
      target: {
        value:
          "J’aime mon ballon. Mon ballon est rouge. Je joue avec mon ballon.",
      },
    });
    expect(
      screen.queryByRole("heading", { name: "Practice just for you" }),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(
      await screen.findByText(/You have finished the basic task/),
    ).toBeTruthy();
    expect(fetcher).toHaveBeenCalledTimes(3);
    fireEvent.change(screen.getByLabelText("Your French answer"), {
      target: { value: "Changed answer." },
    });
    expect(screen.queryByText(/You have finished the basic task/)).toBeNull();
  });
  it("keeps the child's writing after a service failure", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          json: async () => ({
            ok: false,
            error: {
              code: "PROVIDER_UNAVAILABLE",
              message: "Please try again.",
            },
          }),
        }),
    );
    render(<HomeworkResults analysis={analysis} onCorrect={() => {}} />);
    fireEvent.change(screen.getByLabelText("Your French answer"), {
      target: { value: "J’aime mon ballon." },
    });
    await user.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Please try again.",
    );
    expect(
      (screen.getByLabelText("Your French answer") as HTMLTextAreaElement)
        .value,
    ).toBe("J’aime mon ballon.");
  });
});
