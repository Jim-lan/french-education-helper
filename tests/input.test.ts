import { describe, expect, it, vi } from "vitest";
import {
  parseInput,
  validateText,
  MAX_BODY_BYTES,
  MAX_IMAGE_BYTES,
} from "@/server/homework/input";
import { readLimitedBody } from "@/server/http";
const png = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT5sAAAAASUVORK5CYII=",
    "base64",
  ),
);
function request(form: FormData) {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    body: form,
  });
}
describe("input validation", () => {
  it("aborts a stalled JSON upload after 15 seconds", async () => {
    vi.useFakeTimers();
    try {
      const stream = new ReadableStream<Uint8Array>();
      const req = new Request("http://localhost/api/analyze", {
        method: "POST",
        body: stream,
        duplex: "half",
        headers: { "Content-Type": "application/json" },
      } as RequestInit);
      const assertion = expect(parseInput(req)).rejects.toHaveProperty(
        "name",
        "AbortError",
      );
      await vi.advanceTimersByTimeAsync(15001);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
  it("preserves text exactly", async () => {
    const text = "  À l'école.\nLis ceci.  ";
    const req = new Request("http://localhost/api/analyze", {
      method: "POST",
      body: JSON.stringify({ text }),
      headers: { "Content-Type": "application/json" },
    });
    expect(await parseInput(req)).toEqual({ kind: "text", text });
  });
  it.each(["", "  \n ", "x".repeat(10001)])(
    "rejects empty or oversized text %#",
    (text) => {
      expect(() => validateText(text)).toThrow();
    },
  );
  it("accepts PNG image data", async () => {
    const form = new FormData();
    form.set("image", new File([png], "note.png", { type: "image/png" }));
    expect(await parseInput(request(form))).toMatchObject({
      kind: "image",
      mimeType: "image/png",
    });
  });
  it("rejects mislabeled image bytes and HEIC", async () => {
    for (const file of [
      new File(["not png"], "note.png", { type: "image/png" }),
      new File([png], "note.jpg", { type: "image/jpeg" }),
      new File(["heic"], "note.heic", { type: "image/heic" }),
    ]) {
      const form = new FormData();
      form.set("image", file);
      await expect(parseInput(request(form))).rejects.toMatchObject({
        code: "UNSUPPORTED_IMAGE",
      });
    }
  });
  it("rejects ambiguous and duplicate fields", async () => {
    const form = new FormData();
    form.append("text", "Lis.");
    form.append("text", "Écris.");
    await expect(parseInput(request(form))).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });
  it("enforces the image limit before provider use", async () => {
    const form = new FormData();
    form.set(
      "image",
      new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "large.png", {
        type: "image/png",
      }),
    );
    await expect(parseInput(request(form))).rejects.toMatchObject({
      status: 413,
    });
  });
  it("rejects oversized Content-Length before reading", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data; boundary=x",
        "Content-Length": String(MAX_BODY_BYTES + 1),
      },
      body: "",
    });
    await expect(parseInput(req)).rejects.toMatchObject({ status: 413 });
  });
  it("limits streamed bytes without Content-Length and cancels input", async () => {
    let cancelled = false;
    const stream = new ReadableStream({
      pull(controller) {
        controller.enqueue(new Uint8Array(8));
      },
      cancel() {
        cancelled = true;
      },
    });
    await expect(readLimitedBody(stream, 10)).rejects.toMatchObject({
      status: 413,
    });
    expect(cancelled).toBe(true);
  });
});
