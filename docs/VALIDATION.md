# V1 implementation and validation

Validation performed October 25, 2026, after the owner approved the implementation plan.

## Implemented

- Next.js/React/TypeScript application with a responsive, parent/child-friendly interface.
- Pasted French and JPEG/PNG/WebP image inputs with one shared response schema.
- Exact pasted-text preservation, including whitespace and line endings.
- Natural English translation, simple instructions, steps, and extraction warnings.
- Original image retained for comparison, with transcription correction through the text workflow.
- Application-owned Zod validation and deterministic French sentence/word segmentation.
- Server-only Gemini adapter behind `LLMProvider`, with configurable provider/model.
- Independent `SpeechProvider` and browser speech synthesis, preferring fr-CA.
- Word and sentence controls, Stop audio, asynchronous voice loading, and fallback messaging.
- Bounded request/response bodies, upload/provider timeouts, cancellation, input validation,
  process-local concurrency/rate limits, same-origin browser request checks, and safe errors.
- Single-container Docker Compose deployment, non-root Node.js 24 runtime, health check,
  runtime environment configuration, and binding to 0.0.0.0:3000.

## Automated checks

| Check | Result |
| --- | --- |
| `npm test` | 59 tests passed in 10 files; no live API usage |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| Docker image build | Passed with Node.js 24 |
| `docker compose up --build -d --wait` | Passed; one app service is healthy |
| Runtime identity | Node.js 24.22.1; UID 1001 |
| Docker health endpoint | HTTP 200 with `{ "status": "ok" }` |
| Homepage | HTTP 200 |
| Analysis without a configured key | Safe HTTP 503 / PROVIDER_NOT_CONFIGURED |
| Invalid JSON | HTTP 400 |
| Cross-origin browser submission | HTTP 403 |
| Mislabeled image bytes | HTTP 415 |
| Access through Mac Wi-Fi IP | Health endpoint returned HTTP 200 from the Mac |
| Temporary visual QA route | Removed; production returns HTTP 404 |
| Secret file in runtime image | `.env.local` absent |

Tests cover schema rejection and sentence span bounds, French accents/contractions,
source offsets and reconstruction, provider selection/configuration, malformed/refused
or truncated model output, upstream status errors, adapter image encoding, exact text
preservation, image signatures/limits, missing Content-Length, a stalled upload timeout,
process-local limits, safe route errors, and mocked text/image UI workflows.

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

## Remaining acceptance checks

These have not been performed and are required before declaring the full V1 definition
of done in PROJECT_SPEC.md Section 33 complete:

1. Configure a real Gemini API key in the ignored `.env.local` file and recreate the
   container. No key was supplied during implementation.
2. Analyze a synthetic French note and a synthetic note image through the live Gemini
   API. Confirm the configured model is available to the owner's account and the
   translation/explanation are useful.
3. Try an actual homework photo without adding it to Git. Compare the transcription,
   uncertainty warnings, English, and instructions with the original document.
4. On a physical iPad/iPhone or another home Wi-Fi device, open the Mac's local address
   on port 3000 and complete both text and image workflows.
5. Listen to individual words, contractions, and complete sentences in the target
   browsers. Confirm the device's Canadian French voice, sound settings, and Stop.

## Deliberate limits

HEIC conversion, working OpenAI/xAI adapters, cloud TTS, persistent history, accounts,
and cloud deployment remain future scope. Browser voice availability depends on the
operating system. Complex layouts and handwriting may require parent correction.
Gemini's own data-retention terms apply even though the application does not save notes.
