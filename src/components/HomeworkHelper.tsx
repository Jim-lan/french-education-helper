"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AnalyzeResponseSchema,
  type HomeworkAnalysis,
} from "@/lib/homework/schema";
import { HomeworkResults } from "./HomeworkResults";
import { OriginalDocument } from "./OriginalDocument";
import { ArrowIcon, UploadIcon } from "./Icons";
const example = "Écris trois phrases avec le mot « ballon ».";

export function HomeworkHelper() {
  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [analysis, setAnalysis] = useState<HomeworkAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const results = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!file) {
      setImageUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => controller.current?.abort(), []);
  function clearResult() {
    setAnalysis(null);
    setError("");
  }
  function changeMode(next: "text" | "image") {
    setMode(next);
    clearResult();
  }
  function selectFile(next?: File) {
    clearResult();
    setFile(null);
    if (!next) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type)) {
      setError(
        "Choose JPEG, PNG, or WebP. For HEIC, export the photo or use a screenshot as JPEG or PNG.",
      );
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      setError("Choose an image under 10 MiB.");
      return;
    }
    setFile(next);
  }
  function reset() {
    controller.current?.abort();
    setLoading(false);
    setText("");
    setFile(null);
    clearResult();
    if (fileInput.current) fileInput.current.value = "";
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    if (mode === "text" && !text.trim()) {
      setError("Paste some French text first.");
      textarea.current?.focus();
      return;
    }
    if (mode === "image" && !file) {
      setError("Choose a homework image first.");
      return;
    }
    clearResult();
    setLoading(true);
    const current = new AbortController();
    controller.current = current;
    const timer = setTimeout(() => current.abort("timeout"), 80000);
    const body = new FormData();
    if (mode === "image") body.set("image", file!);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: mode === "text" ? JSON.stringify({ text }) : body,
        ...(mode === "text"
          ? { headers: { "Content-Type": "application/json" } }
          : {}),
        signal: current.signal,
      });
      const result = AnalyzeResponseSchema.safeParse(await response.json());
      if (!result.success)
        throw new Error(
          "The app couldn't read the response. Please try again.",
        );
      if (!result.data.ok) throw new Error(result.data.error.message);
      if (!response.ok)
        throw new Error(
          "The explanation couldn't be completed. Please try again.",
        );
      if (controller.current !== current) return;
      setAnalysis(result.data.data);
      setTimeout(() => {
        results.current?.focus();
        results.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch (failure) {
      if (controller.current !== current) return;
      if (current.signal.aborted) {
        if (current.signal.reason === "timeout")
          setError("That took too long. Please try again.");
      } else
        setError(
          failure instanceof Error && !(failure instanceof TypeError)
            ? failure.message
            : "We couldn't connect. Check your connection and try again.",
        );
    } finally {
      clearTimeout(timer);
      if (controller.current === current) {
        setLoading(false);
        controller.current = null;
      }
    }
  }
  function cancel() {
    const current = controller.current;
    controller.current = null;
    current?.abort();
    setLoading(false);
  }
  function correct() {
    if (!analysis) return;
    setText(analysis.originalFrench);
    setMode("text");
    clearResult();
    setTimeout(() => {
      textarea.current?.focus();
      textarea.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }
  return (
    <>
      <section className="input-card" aria-labelledby="input-heading">
        <div className="input-card-heading">
          <span className="step-number">01</span>
          <div>
            <h2 id="input-heading">Start with the teacher’s note</h2>
            <p className="muted">
              A few words or a whole instruction. We’ll help you understand.
            </p>
          </div>
        </div>
        <div
          className="input-switch"
          role="group"
          aria-label="Homework input method"
        >
          <button
            type="button"
            aria-pressed={mode === "text"}
            disabled={loading}
            onClick={() => changeMode("text")}
          >
            <span aria-hidden="true">Aa</span> Paste French text
          </button>
          <button
            type="button"
            aria-pressed={mode === "image"}
            disabled={loading}
            onClick={() => changeMode("image")}
          >
            <UploadIcon /> Upload a photo
          </button>
        </div>
        <form onSubmit={submit}>
          {mode === "text" ? (
            <div className="text-input-wrap">
              <label htmlFor="french-input">The teacher’s French</label>
              <textarea
                id="french-input"
                ref={textarea}
                lang="fr-CA"
                value={text}
                maxLength={10000}
                disabled={loading}
                onChange={(event) => {
                  setText(event.target.value);
                  clearResult();
                }}
                placeholder="Écris trois phrases avec le mot « ballon »."
                spellCheck={false}
                aria-describedby="text-help"
              />
              <div className="input-help" id="text-help">
                <span>Keep the original accents and punctuation.</span>
                <span>{text.length.toLocaleString()} / 10,000</span>
              </div>
            </div>
          ) : (
            <div className="upload-area">
              <label htmlFor="homework-image">
                <span className="upload-symbol">
                  <UploadIcon width={28} height={28} />
                </span>
                <strong>{file ? file.name : "Choose a homework photo"}</strong>
                <span>JPEG, PNG, or WebP · up to 10 MiB</span>
              </label>
              <input
                ref={fileInput}
                id="homework-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={loading}
                onChange={(event) => selectFile(event.target.files?.[0])}
              />
              <p className="muted small">
                Use a clear picture with the whole note in view. HEIC photos
                need to be exported as JPEG or PNG.
              </p>
              {file && (
                <button
                  type="button"
                  className="text-button"
                  disabled={loading}
                  onClick={() => {
                    setFile(null);
                    clearResult();
                    if (fileInput.current) fileInput.current.value = "";
                  }}
                >
                  Remove image
                </button>
              )}
            </div>
          )}
          {error && (
            <div className="error-message" role="alert">
              <strong>Let’s try that again</strong>
              <p>{error}</p>
            </div>
          )}
          <div className="form-actions">
            <button
              className="primary-button"
              type="submit"
              disabled={loading || (mode === "text" ? !text.trim() : !file)}
            >
              {loading ? (
                <>
                  <span className="spinner" /> Reading the homework…
                </>
              ) : (
                <>
                  Help me understand <ArrowIcon />
                </>
              )}
            </button>
            {loading ? (
              <button className="text-button" type="button" onClick={cancel}>
                Cancel
              </button>
            ) : (
              <button className="text-button" type="button" onClick={reset}>
                Start fresh
              </button>
            )}
          </div>
          <p className="privacy-note">
            Your note is sent to the configured AI provider for analysis. This
            app doesn’t save your homework.
          </p>
          <div className="sr-only" role="status" aria-live="polite">
            {loading
              ? "Reading and understanding the French homework."
              : analysis
                ? "Your explanation is ready."
                : ""}
          </div>
        </form>
      </section>
      {imageUrl && file && (
        <OriginalDocument url={imageUrl} filename={file.name} />
      )}
      {analysis ? (
        <div ref={results} tabIndex={-1} className="results-focus">
          <HomeworkResults analysis={analysis} onCorrect={correct} />
        </div>
      ) : (
        !loading && (
          <section className="example-card" aria-labelledby="example-heading">
            <div>
              <span className="eyebrow">A SMALL EXAMPLE</span>
              <h2 id="example-heading" lang="fr-CA">
                {example}
              </h2>
              <p>“Write three sentences using the word ‘ballon.’”</p>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setMode("text");
                setText(example);
                clearResult();
                textarea.current?.focus();
              }}
            >
              Try this note <ArrowIcon />
            </button>
          </section>
        )
      )}
    </>
  );
}
