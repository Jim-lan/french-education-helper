# V1 implementation and validation

Validation performed October 25, 2026, after the owner approved the implementation plan.

## Implemented

- Next.js/React/TypeScript application with a responsive, parent/child-friendly interface.
- Pasted French and JPEG/PNG/WebP image inputs with one shared response schema.
- Exact pasted-text preservation, including whitespace and line endings.
- Natural English translation, simple instructions, steps, and extraction warnings.
- Contextual word meanings beneath the translation, included in the same AI response;
  source spelling/order, deduplication, contractions, and explicit unavailable entries.
- Original image retained for comparison, with transcription correction through the text workflow.
- Application-owned Zod validation and deterministic French sentence/word segmentation.
- Server-only Gemini adapter behind `LLMProvider`, with configurable provider/model.
- Independent `SpeechProvider` and browser speech synthesis, preferring fr-CA.
- Word and sentence controls in the original text and meanings list, whole-note reading,
  shared Stop audio, asynchronous voice loading, pause recovery, and silent-start detection.
- Bounded request/response bodies, upload/provider timeouts, cancellation, input validation,
  process-local concurrency/rate limits, same-origin browser request checks, and safe errors.
- Single-container Docker Compose deployment, non-root Node.js 24 runtime, health check,
  runtime environment configuration, and binding to 0.0.0.0:3000.

## Automated checks

| Check                                 | Result                                          |
| ------------------------------------- | ----------------------------------------------- |
| `npm test`                            | 106 tests passed in 19 files; no live API usage |
| `npm run typecheck`                   | Passed                                          |
| `npm run build`                       | Passed                                          |
| Docker image build                    | Passed with Node.js 24                          |
| `docker compose up --build -d --wait` | Passed; one app service is healthy              |
| Runtime identity                      | Node.js 24.22.1; UID 1001                       |
| Docker health endpoint                | HTTP 200 with `{ "status": "ok" }`              |
| Homepage                              | HTTP 200                                        |
| Analysis without a configured key     | Safe HTTP 503 / PROVIDER_NOT_CONFIGURED         |
| Invalid JSON                          | HTTP 400                                        |
| Cross-origin browser submission       | HTTP 403                                        |
| Mislabeled image bytes                | HTTP 415                                        |
| Access through Mac Wi-Fi IP           | Health endpoint returned HTTP 200 from the Mac  |
| Temporary visual QA route             | Removed; production returns HTTP 404            |
| Secret file in runtime image          | `.env.local` absent                             |

Tests cover schema rejection and sentence span bounds, French accents/contractions,
source offsets and reconstruction, provider selection/configuration, malformed/refused
or truncated model output, upstream status errors, adapter image encoding, exact text
preservation, image signatures/limits, missing Content-Length, a stalled upload timeout,
process-local limits, safe route errors, and mocked text/image UI workflows.
Word-meaning checks cover backward-compatible omitted dictionaries, invalid entries,
normalization of case/accents/apostrophes, source grounding, deduplication, missing
meanings, image/text rendering, and expansion/collapse without extra API calls.

A test-only provider with a different provider ID verifies the service is independent
of Gemini. Production does not offer a mock provider. DOM workflow tests verify word
and sentence pronunciation text/locale and assert that pronunciation makes no additional
analysis request. Image workflow tests verify that the original remains visible after
analysis and while correcting the French.

Local host checks ran on the Mac's installed Node.js 25.4.0. The project targets Node.js
24 and was built and started successfully in that runtime inside Docker.

## Browser checks

- Previewed the actual page, example-note input, loading, and missing-key message.
- Inspected result components using synthetic homework in a temporary local-only QA route.
- Checked the two-column result view at desktop width and the stacked view at 390px.
- Verified document width equals viewport width at 390px with no horizontal overflow.
- Measured representative word targets at a minimum of 44 by 44 CSS pixels.
- Confirmed punctuation stays with words and the original sentence text remains intact.
- The preview browser reported an available Canadian French voice. This is not an
  audible playback or physical-device acceptance test.
- Removed the temporary QA route before the final production build/container checks.
- Word-meaning enhancement: inspected the contextual glossary in the desktop results,
  verified native expand/collapse controls, and confirmed no overflow at 390px.

## Pronunciation and homework-answer update

- Both the original French and glossary words now use shared, working audio controls.
- Added explicit whole-note reading alongside each sentence speaker and word buttons.
- Browser speech was tested against live analysis: the browser emitted start and
  finish events for `ballon` in both the original text and glossary, and for the
  complete teacher instruction. This verifies
  the browser engine; audible sound on the owner's device still needs confirmation.
- Paused synthesis is resumed, stale utterance callbacks are ignored, and a six-second
  startup timeout surfaces a browser that fails silently. All controls stay independent
  of LLM calls.
- Live text analysis, incomplete-answer review with customized practice, and a correct
  three-sentence answer all succeeded through the production app. The incomplete answer
  was flagged as one sentence out of three; the revised answer passed both requirements.
- Added `/api/review`, application-owned review schemas, provider review capability,
  an answer form, per-requirement feedback, and targeted practice. The original task
  must pass separately; editing resets its result. Ambiguous tasks request parent review.
- Unit/DOM/API tests verify incomplete/correct review states, practice without premature
  completion, state reset after edits, safe errors, answer retention, and no automatic
  request while typing.
- Live provider diagnostics found model availability restrictions and rejected schema
  defaults/large bounds. The default now uses a model with a successful structured
  response; wire schemas omit unsupported constraints while Zod retains strict local
  bounds and business validation.

## Audio throughout the learning workflow

Shared audio extension: tests cover individual words, sentences, and complete
text for an answer, quiz-style prompt, generated sample, and enhanced sentence.
Workflow tests additionally cover live draft previews, practice prompts/answers,
generated examples, edit updates, and Stop without additional fetch calls. Legacy
review payloads default to an empty `frenchExamples` array; malformed samples are
rejected. The quiz-style test exercises the reusable renderer, not a quiz game.

The rebuilt production container was tested with a synthetic note and a live
Gemini review. Browser playback started for the homepage example, answer words and
sentences, two generated French examples, the customized practice question, and
practice-answer words, sentences, and full text. The shared Stop control stopped
playback; completed playback dismissed the floating player. At 390px, the document
width remained 390px with no horizontal overflow. These checks verify browser
events and controls; physical-device audible playback remains an owner check.

## Saved history, learning games and monthly reviews

The owner authorized this extension after the original V1. Implemented SQLite
storage in the single app container, a persistent Docker volume, date/month keys
in the household time zone, source-image retrieval, saved answer/practice attempts,
requirement marks, history filtering, and redo without overwriting earlier work.
Parent-review tasks have no numerical mark. Original-task passes unlock a short
structured quiz with spelling, meanings, grammar and sound questions; all quiz
attempts and versions are retained. An hourly in-process job prepares reviews for
completed learning months and catches up after downtime, with leases and failure
backoff. Current-month preview and explicit retry/update are available in the UI.

The additional deterministic tests cover database close/reopen persistence, image
bytes, date/month and daylight-saving boundaries, unrelated-note rejection,
cross-lesson practice protection, marks, quiz answer validation, accent-sensitive
grading, saved versions/redos, server-owned task binding, same-origin access,
monthly statistics, provider-independent quiz generation, cached reopen without
AI, monthly catch-up/backoff, and UI review/redo with pronunciation after marking.
Spelling audio deliberately hides its target from visible playback status.

Live production checks with synthetic material succeeded for:

- Text analysis saved to history, a passing written answer and an unlocked lesson
  quiz. The lesson quiz was marked 4/4 and its saved try remained available on redo.
- A PNG note sent through the actual Gemini multimodal API; its transcription and
  original source image are stored in the local database.
- An unrelated shopping receipt rejected with an explanation; history stayed at
  two records before and after the rejection.
- Current-month progress and an AI summary quiz generated from both saved notes.
  The monthly quiz was marked 4/4, then reopened from its saved attempt; French
  answer audio remained enabled. Celebration controls were exercised; audible
  output still requires the owner's device confirmation.
- History and quizzes survived production-container rebuilds. The runtime remains
  UID 1001, with mode 700 on its data directory and mode 600 on the SQLite file.
- A homework redo saved a second 2/2 attempt while keeping the first 2/2 answer
  and feedback. Monthly review detected the new work and offered an updated quiz
  version while preserving the existing quiz and score.
- Desktop journal layout and phone-width monthly layout. The monthly page and
  marked quiz measured 390px document width at a 390px viewport without overflow.
  The stored original image also loaded from history at that width without overflow.

Only synthetic demonstration notes were used; no child's private homework was
added to the repository. Automatic historical-month catch-up was verified with
controlled-clock tests; the live database currently contains only the current
month's demonstration notes. Physical-device checks below remain outstanding.

## Portable installation and delivery

The application runtime has no macOS paths or platform-specific APIs. Docker
builds the matching Linux image for the host CPU. UI storage labels now refer to
the home server; the original Mac deployment remains one supported installation.
README.md includes complete macOS, Windows/PowerShell and Linux setup, private
configuration, startup/health, LAN access, maintenance, backup and troubleshooting.
The Compose project name is fixed to preserve the same volume across folder names.

`scripts/start.sh` and `scripts/start.ps1` preserve existing `.env.local`; a missing
file is created from the blank template and startup stops for key configuration.
The shell launcher was exercised from a path containing spaces with a test Docker
command: private template permissions, first-run stop, key-file preservation and
the final Compose arguments all passed. The real shell launcher also starts the
existing Docker installation. The PowerShell script was reviewed for Windows
PowerShell-compatible syntax but was not executed on a Windows host.

An x86-64 (`linux/amd64`) image was built and run with emulation on the ARM64
development computer. Health returned 200; empty SQLite history and monthly
statistics worked, and an absent API key produced the expected safe 503. No
credentials were supplied to this temporary test container; it was removed after
the checks. ARM64 Docker builds/startup have also passed on the development host.
These runtime checks are not physical Windows/Linux-host certification.

`npm run package:install` builds a versioned ZIP from committed Git HEAD using an
explicit file allowlist. It emits a SHA-256 checksum and revision manifest. Local
secrets, SQLite data and generated builds are excluded; recipients build through
Docker without installing host Node.js. This is a portable Docker installation
bundle with an online first build, not a native desktop installer or offline image.

## Remaining acceptance checks

The outstanding items below are required before declaring the full V1 definition
of done in PROJECT_SPEC.md Section 33 complete:

1. Verify audible French on the owner's device. The browser has emitted actual
   start/finish events for original words, glossary words, and the full sentence.
2. Try an actual homework photo without adding it to Git. Compare the transcription,
   uncertainty warnings, English, and instructions with the original document.
3. On a physical iPad/iPhone or another home Wi-Fi device, open the Mac's local address
   on port 3000 and complete both text and image workflows.
4. Listen to individual words, contractions, and complete sentences in the target
   browsers. Confirm the device's Canadian French voice, sound settings, and Stop.

## Deliberate limits

HEIC conversion, working OpenAI/xAI adapters, cloud TTS, accounts,
and cloud deployment remain future scope. Browser voice availability depends on the
operating system. Complex layouts and handwriting may require parent correction.
Gemini's own data-retention terms apply in addition to the application's local history.
