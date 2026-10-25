# French Education Helper — V1 implementation plan

Status: **approved by the project owner on October 25, 2026; implementation in progress**.

The owner approved proceeding after the specification, plan, and README were
committed. This document preserves the approved proposal. See
[VALIDATION.md](VALIDATION.md) for implemented behavior, verification results,
and checks that still require a configured API key or a physical device.

Implementation adjustment: pasted text uses an `application/json` body containing
`{ text }`, because multipart form serialization normalizes line endings. Images
use multipart form data containing one `image` file. Both return the same
application-owned response schema. French word tokens use deterministic Unicode
matching for consistent apostrophe/compound behavior; sentence boundaries use
`Intl.Segmenter` with a line-aware fallback.

The authoritative requirements are [PROJECT_SPEC.md](PROJECT_SPEC.md), copied
unchanged from the supplied master specification. This plan addresses all ten
items in Section 34 and supersedes the earlier plan.

## 1. Repository inspection and current state

The workspace already contains a minimal Next.js/React/TypeScript shell from the
previous planning checkpoint, configuration, a dependency lockfile, draft shared
TypeScript types and provider interface, and initial Docker/Compose files. The
placeholder page has no text analysis, upload, pronunciation, or provider calls.
TypeScript, production build, and Compose configuration checks previously passed.
Docker runtime and physical-device checks have not been performed.

No Git repository existed when this specification was received. Git initialization,
master-specification commit, and GitHub setup are explicitly authorized now and
are documentation/repository work, separate from approving implementation.

No application code will be changed during this checkpoint. The existing draft
contracts and environment template will be reconciled with the approved design
in Phase 0. Existing dependencies and Docker files will be reviewed rather than
regenerated. The public GitHub repository `Jim-lan/log-pilot` uses `main`; use the
same account, visibility, and default branch for `french-education-helper`.

## 2. Concrete V1 architecture

Use one Next.js App Router application with React, TypeScript, lightweight CSS,
Zod validation, and a Node.js server runtime. Ship the frontend and server in one
Docker container. No database, saved history, accounts, Python service, or cloud
hosting in V1.

```text
Browser (Mac / iPad / iPhone)
  HomeworkInput → POST /api/analyze
  OriginalDocument stays visible for comparison
  FrenchText + Translation + StudentExplanation render validated data
  Word / SentenceSpeaker → SpeechProvider → BrowserSpeechProvider (fr-CA)
                                [no analysis or backend request]

Next.js Node server
  validate input and enforce limits
    → HomeworkAnalysisService
      → provider factory (LLM_PROVIDER, LLM_MODEL, selected API key)
        → GeminiProvider (V1)
        → OpenAIProvider / XaiProvider (future; no fake implementations)
      → application-owned response validation and deterministic sentence spans
    → JSON response
```

`POST /api/analyze` accepts multipart form data containing exactly one text or
image input. Phase 1 supports text only; Phase 3 adds image acceptance without
changing result rendering. Success is `{ ok: true, data: HomeworkAnalysis }`;
errors are `{ ok: false, error: { code, message } }` with appropriate HTTP status.
The API returns data, never generated application HTML. React escapes model text.
No `dangerouslySetInnerHTML` is needed.

Keep all provider/configuration modules behind `server-only`. Browser-facing code
imports only application-owned schemas/types and speech code. Credentials enter
the runtime via ignored `.env.local`, with no `NEXT_PUBLIC_` API keys, client props,
build arguments, or diagnostic payloads containing credentials.

## 3. Proposed HomeworkAnalysis TypeScript/Zod schema

The following is a **design proposal in documentation**, not implementation code.
Zod is the source of truth; infer the TypeScript type from it. Use camelCase for
application fields consistently. The names in the master spec are conceptual.

```ts
const AnalysisWarningSchema = z.strictObject({
  code: z.enum(["UNCLEAR_SOURCE", "PARTIAL_EXTRACTION", "MIXED_LANGUAGE"]),
  message: z.string().min(1).max(1000),
  sourceExcerpt: z.string().max(1000).optional(),
});

const FrenchSentenceSchema = z.strictObject({
  text: z.string().min(1).max(30000),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
});

const AnalysisContentSchema = z.strictObject({
  originalFrench: z.string().min(1).max(30000),
  englishTranslation: z.string().min(1).max(30000),
  studentExplanation: z.string().min(1).max(10000),
  steps: z.array(z.string().min(1).max(1000)).max(50),
  warnings: z.array(AnalysisWarningSchema).max(50),
});

const HomeworkAnalysisSchema = AnalysisContentSchema.extend({
  schemaVersion: z.literal("1"),
  sourceType: z.enum(["text", "image"]),
  sentences: z.array(FrenchSentenceSchema).max(2000),
});

type AnalysisContent = z.infer<typeof AnalysisContentSchema>;
type HomeworkAnalysis = z.infer<typeof HomeworkAnalysisSchema>;
```

Add cross-field validation: every sentence must match
`originalFrench.slice(start, end)`, spans must be ordered and non-overlapping,
and text input must return the exact submitted source string. Offsets are
JavaScript UTF-16 string offsets. Empty steps/warnings are valid. A readable
vocabulary list still works even when it is not a grammatical sentence.

The service adds schemaVersion, sourceType, and sentence spans. It derives
sentences deterministically, with line/list-aware fallback. The browser derives
word, punctuation, and whitespace tokens from those source spans; token objects
are not generated by the model. Reassembling tokens must preserve the source.
Future word actions can use the token text and source offsets.

Gemini receives a compatible JSON Schema derived from the application content
schema; its wire representation may use explicit nulls instead of optional fields
if the selected API requires it. Its adapter maps that representation back to the
application schema. The service still validates the normalized result at runtime.

Preserve pasted text exactly, using trim only to detect empty input. For images,
label text as an AI transcription, preserve wording/spelling as legible, mark
unreadable spans, and include warnings. Keep the actual image visible as the source
of truth throughout the results view. A completely unreadable image returns a
friendly error rather than an invented transcription. Explain the homework task
without completing the student's work or inventing requirements.

## 4. Proposed LLMProvider and speech interfaces

```ts
type ProviderId = "gemini" | "openai" | "xai";

type HomeworkInput =
  | { kind: "text"; text: string }
  | {
      kind: "image";
      bytes: Uint8Array;
      mimeType: "image/jpeg" | "image/png" | "image/webp";
    };

interface LLMProvider {
  readonly id: ProviderId;
  readonly model: string;
  readonly capabilities: { imageInput: boolean; structuredOutput: boolean };
  analyzeHomework(
    input: HomeworkInput,
    options: { signal: AbortSignal },
  ): Promise<AnalysisContent>;
}

interface SpeechProvider {
  speak(text: string, options?: { locale?: string; rate?: number }): void;
  stop(): void;
  isSupported(): boolean;
}
```

The factory reads `LLM_PROVIDER=gemini`, `LLM_MODEL=<selected-model>`, and the
selected provider's API key. Business components call the service, not SDKs.
Only the Gemini adapter is implemented initially; it encapsulates HTTP/SDK calls,
multimodal encoding, provider JSON normalization, and provider error mapping.
Selecting OpenAI/xAI before implementation yields a clear unsupported-provider
configuration error. Do not silently switch providers or send a note elsewhere.

The normalized `AnalysisContent` return differs from the final `HomeworkAnalysis`
because the application, not the provider, owns source metadata and segmentation.
Text preservation is enforced again in the service. Provider refusals, incomplete
JSON, schema failures, quotas, and timeouts map to safe application errors.

`BrowserSpeechProvider` wraps browser speech synthesis behind `SpeechProvider`.
The React layer uses that interface through a small hook/context, so cloud TTS
could replace it later. Prefer fr-CA, then another French voice with a visible
fallback notice; actual device voice availability cannot be guaranteed. Load
voices asynchronously, invoke speech directly from user gestures, cancel previous
speech, and provide Stop. Do not pre-generate audio or call the LLM on word taps.

## 5. Proposed project structure

Retain the existing `src/` layout and keep provider internals separate from shared
schemas and browser helpers. Paths below are planned; missing files are created
only after approval.

```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css
    api/
      analyze/route.ts
      health/route.ts
  components/
    HomeworkInput.tsx
    OriginalDocument.tsx
    HomeworkResults.tsx
    FrenchText.tsx
    FrenchWord.tsx
    SentenceSpeaker.tsx
    Translation.tsx
    StudentExplanation.tsx
  lib/
    homework/schema.ts
    french/segment.ts
    speech/provider.ts
    speech/browser-speech.ts
    speech/use-speech.ts
  server/
    config.ts
    homework/analyze.ts
    homework/input.ts
    llm/
      types.ts
      prompt.ts
      provider-factory.ts
      providers/gemini.ts
  types/homework.ts             # inferred/re-exported application types
 tests/
  fixtures/                    # synthetic notes and provider responses only
  schema.test.ts
  segment.test.ts
  provider-factory.test.ts
  analyze.test.ts
  input.test.ts
 docs/
  PROJECT_SPEC.md               # authoritative, preserved verbatim
  implementation-plan.md        # this reviewable proposal
 public/
 .env.example
 .gitignore
 .dockerignore
 .nvmrc
 Dockerfile
 compose.yaml                   # Docker Compose standard filename
 package.json
 package-lock.json
 README.md
```

No empty fake OpenAI/Grok implementations, settings page, cloud TTS code, or
storage layer. A registry and documented contract are sufficient extension points.

## 6. Incremental implementation plan and verification gates

### Phase 0 — Foundation (after approval)

Reconcile the existing shell and draft types with this plan. Confirm Node.js 24,
Next.js conventions, lightweight CSS, ignored runtime environment files, and
application metadata. Update `.env.example` to use generic `LLM_MODEL`; preserve
provider-specific key variables. Add the shared schema, test tooling, and clear
README startup instructions. Git setup/spec commit are performed now as separately
authorized work; no Phase 0 application changes are authorized yet.

Gate: shell builds, TypeScript passes, secret files are ignored, and the folder
layout/configuration agrees with the approved plan.

### Phase 1 — Text workflow

Implement request validation, application schema, prompt, service, provider factory,
and Gemini adapter. Connect a pasted-text form to French, English translation,
and student-explanation results. Start with a 10,000-character input cap, bounded
provider response sizes, a 60-second timeout, cancellation, and safe errors.
Treat homework text as untrusted content, not executable instructions.

Gate: synthetic text works end to end; exact source preservation, empty/oversized
text, missing config, unimplemented provider, malformed model output, quota/errors,
and timeouts are covered by tests using mocks. Live Gemini smoke tests use a
configured key and synthetic content and are separate from automated tests.

### Phase 2 — Pronunciation

Implement the speech interface, browser provider, French segmentation, word
buttons, sentence controls, and Stop. Preserve accents, punctuation, whitespace,
and straight/curly apostrophes. Verify l'école, j'aime, c'est, aujourd'hui, hyphens,
vocabulary lists, and multi-line instructions. Use approximately 44px minimum
touch targets with keyboard focus and accessible names.

Gate: segmentation tests pass; interaction tests assert the spoken text and
locale and verify word/sentence taps trigger no LLM/network request. Listen on
available desktop/mobile devices; track physical iPad/iPhone checks explicitly.

### Phase 3 — Image workflow

Add JPEG/PNG/WebP upload, preview, removal, and multimodal analysis through the same
service/schema. Keep the original image visible before and after submission and
label extracted French as AI transcription. Use a client object URL for the image,
revoke it on replacement/reset, and never persist uploads on the server.

Start with a 10 MiB image cap and a 12 MiB total multipart-body limit enforced
while reading, including requests without Content-Length. Verify file signatures,
not just extensions/MIME strings. Reject HEIC clearly in initial V1 unless a
small, reliable conversion approach is approved later. Bound concurrent analysis
requests in the one process and cancel superseded work.

Gate: synthetic image fixtures, invalid MIME/signatures, oversize requests,
unreadable/partial text, and original-document retention are verified. Results
reuse Phase 1 rendering. A real homework photo can be tested by the owner after
synthetic checks, without committing private content.

### Phase 4 — Docker and LAN access

Review and finish the existing multi-stage Dockerfile and single-service
`compose.yaml`; keep standalone Next.js output, non-root runtime, Node.js 24,
runtime secrets, and 0.0.0.0:3000 binding. Add a small non-sensitive health endpoint
and startup/health documentation. Verify `docker compose up -d` builds/starts the
service on a fresh local setup; document explicit rebuild commands for changes.

Gate: container build/start/health and Mac access work. Check the Mac's Wi-Fi IP
and test from another device on the same Wi-Fi. Document Docker Desktop, firewall,
Wi-Fi isolation, Mac system sleep/shutdown, and the difference between screen-off
and system sleep. No internet port forwarding or cloud deployment.

### Phase 5 — Provider abstraction verification

Review imports and configuration boundaries. Use a test-only stub implementing
LLMProvider to prove service and UI behavior are independent of Gemini. Document
the steps for adding OpenAI or xAI: implement adapter, normalize output, register
it, and supply configuration. No second production provider is needed.

Gate: provider-selection and normalization tests pass; no provider SDKs or keys
appear in client code; a provider can be added without editing result components.

### Phase 6 — Polish and handoff

Refine responsive image/French/English layout, loading without fake progress,
retry/reset, readable warnings, focus/accessibility, touch, and French tokenization.
Use one truthful loading message for a single upstream call. State that uploads
are sent to the configured provider and that provider retention follows its terms.

Gate: required unit tests, mocked end-to-end flows, TypeScript, production build,
container smoke tests, and available device checks pass. Report anything requiring
the owner's physical device or API key; do not claim unperformed checks. Verify
Section 33's complete scenario before calling V1 done.

## 7. Ambiguities and architectural risks

| Topic | Proposed resolution | Timing |
| --- | --- | --- |
| Actual image is authoritative | Keep image alongside AI interpretation; extracted text is explicitly labeled | Required architecture; included in plan |
| HEIC practicality | JPEG/PNG/WebP first; helpful HEIC rejection, conversion deferred | Approve default with plan |
| Exact Gemini model and quotas | Use LLM_MODEL; verify a suitable available multimodal model during Phase 1; do not promise free usage | Model/key needed for live checks, not planning |
| fr-CA voice availability | Prefer fr-CA, disclose fallback; user-installed device voices determine availability | Test in Phase 2; cloud TTS deferred |
| Handwriting/layout/circled content | Preserve readable content, surface warnings, avoid invented reconstruction; no pixel-accurate worksheet recreation | Core design now; refine with examples later |
| Mixed French/English text | Preserve pasted source exactly; translate/explain relevant French and warn if needed; do not lose context silently | Core prompt/validation design |
| Prompt injection and invalid output | Treat source as data, enforce runtime schemas, escape rendering, bound inputs/time/output | Required before accepting inputs |
| Source lifetime | Browser memory and request memory only; no localStorage/history/database; reset/reload clears note | Required architecture; included in plan |
| Model field names vs previous drafts | Approved application schema replaces draft names; update existing types in Phase 0 | Approval now; code changes later |
| Future online deployment | Keep Node/container app portable; authentication/privacy/access controls become a separate milestone | Deferred |
| Large uploads/provider cost | Stream body-size enforcement, bounded concurrency, timeout and modest process-local rate limit; no paid automated tests | Implement with API, without extra infrastructure |

## 8. Decisions required now versus later

**Approval required before implementation:** approve this architecture, schema,
provider and speech boundaries, incremental phases, and proposed V1 defaults
(image formats/limits, no retention, Gemini only, no accounts). There is no
additional unresolved product question that must block drafting the plan.

**Required when running live Gemini:** an API key configured by the owner in
`.env.local` and a supported model identifier. Do not ask for credentials in chat
or commit them. Model selection can be completed during Phase 1 with current
provider documentation.

**Required for final LAN acceptance:** the Mac running Docker Desktop and an
available iPad/iPhone/other Wi-Fi device. Device availability does not block unit
or mocked integration tests.

**Safely deferred:** OpenAI/xAI integrations, HEIC conversion, settings UI, cloud
TTS, vocabulary actions/history, saved homework, tutoring, database, accounts,
cloud deployment, and public privacy/security controls. Keep extension seams
small; build no speculative implementations.

## 9. Approval checkpoint

Present this plan to the owner and wait for explicit approval. Until then, change
only the specification, planning/project documentation, and the explicitly
requested Git/GitHub setup. Do not begin Phase 0 or Phase 1 implementation.
