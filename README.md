# French Education Helper

Understand the homework. Practise the French.

A local web application for Grade 3 French Immersion students and their parents.
Paste French text or upload a teacher's homework note, compare the original with
a natural English translation and simple instructions, and tap French words or
sentences to hear them pronounced.

**Status:** V1 implementation is available. Automated tests, production builds,
Docker startup, and responsive browser checks have passed. Live Gemini analysis
requires your API key; physical iPad/iPhone and audible speech checks remain to
be completed. See [validation results](docs/VALIDATION.md).

## Start on your Mac

Install and start Docker Desktop, then open a terminal in this project folder.

1. Create your private configuration file if it does not already exist:

   ```sh
   cp .env.example .env.local
   ```

   Skip this command if you have already configured `.env.local`, so you keep
   your existing key. The initial local workspace may already have a blank copy.

2. Edit `.env.local` locally:

   ```dotenv
   LLM_PROVIDER=gemini
   LLM_MODEL=gemini-3.5-flash-lite
   GEMINI_API_KEY=your-api-key
   ```

   Obtain an API key through [Google AI Studio](https://aistudio.google.com/apikey).
   Do not paste your key into chat or commit it to Git. Model availability and
   quotas depend on your provider account. The model is configurable; the default
   is documented in [Google's model reference](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite).

3. Start the single container:

   ```sh
   docker compose up -d
   ```

   The first start builds the image and downloads dependencies. It needs internet
   access. Open [French Education Helper](http://localhost:3000) on the Mac.

After changing application code:

```sh
docker compose up --build -d
```

After changing API credentials or model configuration, recreate the container:

```sh
docker compose up -d --force-recreate
```

Useful commands:

```sh
docker compose ps
docker compose logs --tail=50 app
docker compose down
```

The built-in health check uses `/api/health`. A healthy container means the app
is serving HTTP; it does not verify provider credentials or consume AI quota.

## Open it from an iPad, iPhone, or another computer

Connect the device to the same home Wi-Fi as the Mac. Find the Mac's Wi-Fi IP in
System Settings → Wi-Fi → Details → TCP/IP, then open:

```text
http://<Mac-Wi-Fi-IP>:3000
```

The app and published port listen on `0.0.0.0:3000`. No specific local address is
hard-coded. Allow incoming connections through the Mac firewall if prompted;
guest Wi-Fi or client isolation may prevent devices reaching one another.

**The Mac must stay awake with Docker running.** The display can be off and the
Mac can be locked. System sleep or shutdown makes the app unavailable. This V1
is intended for a trusted home network; do not configure internet port forwarding.

## Use the app

1. Choose **Paste French text** or **Upload a photo**.
2. Paste the teacher's text or choose a clear JPEG, PNG, or WebP image.
3. Select **Help me understand**.
4. Read the French, natural English translation, and **What do I need to do?**
   The expanded **Word meanings** section under the translation shows short English
   meanings for individual French words. Collapse it when you want to focus on
   the full sentence. Repeated words appear once; contractions stay together.
5. Tap a French word to hear it, or use a speaker to hear the complete sentence.
   **Stop audio** cancels playback.

Word meanings are generated as part of the original analysis, with no extra API
request when expanding the section or tapping words. They reflect the note's
context and may differ from a literal sentence translation. Up to 500 distinct
words receive definitions; omitted or uncertain meanings show **Not available**.
Analyze an older result again to obtain meanings. Check these AI-generated
definitions against the source just as you would the full translation.

For photos, the original remains visible as the source of truth. Extracted text
is labeled as an AI transcription. Check uncertain content against the image;
**Correct the French & analyze again** copies the transcription into the text
field while retaining the image for comparison.

The app explains the teacher's requirements rather than doing the homework.
AI can make mistakes, particularly with handwriting or complex worksheet layouts.

## Pronunciation

Speech uses the browser's speech synthesis on demand, independently of the AI.
No LLM or app-server request is made when tapping a word or sentence, and no audio
files are generated during analysis. A replaceable `SpeechProvider` interface
keeps speech separate from the UI and LLM provider.

Canadian French (`fr-CA`) is preferred. If unavailable, another French voice is
used and the app explains the fallback. Install a Canadian French voice in your
device's speech/accessibility settings if necessary. Voice availability, audible
output, and whether a system voice uses an online service depend on the device.
Browsers without speech support show a message while text results remain usable.

## Limits and privacy

- Text: up to 10,000 JavaScript string characters.
- Images: JPEG, PNG, or WebP, up to 10 MiB; signatures and MIME types are checked.
- HEIC: export as JPEG/PNG or use a screenshot; automatic conversion is deferred.
- Request body: 12 MiB for uploads; JSON text bodies are bounded at 100,000 bytes.
- Reading the request: 15-second timeout. Provider call: 60-second timeout.
- One process handles up to 2 concurrent analyses and 20 requests per minute.

The app processes notes/images in memory, does not save homework history, and
returns uncached analysis responses. Refreshing or resetting clears the note.
Submitted content is sent to the configured AI provider; provider-side retention
follows its own terms. Uploaded content is never committed or served publicly by
this repository. Automated tests use synthetic content and mocked providers.

API credentials stay in server-side environment variables. `.env.local` and other
real `.env` files are ignored by Git and excluded from Docker build context.
`.env.example` contains no secrets. Never use `NEXT_PUBLIC_` for keys, add keys to
source code, or include credentials in logs. The app uses provider APIs, not
consumer AI website logins.

## Development

Use Node.js 24 (see `.nvmrc`):

```sh
npm ci
npm run dev
```

Open [the development server](http://localhost:3000). Stop the Docker app first
if it occupies port 3000, or use `npm run dev -- --port 3001`. Development also
loads `.env.local`; restart after changing configuration.

```sh
npm test
npm run typecheck
npm run build
```

Tests cover schemas, exact source preservation, input limits, image validation,
French contractions/segmentation, configuration, provider normalization/errors,
API responses, UI workflows, and independent pronunciation. They do not consume
real API quota. See [VALIDATION.md](docs/VALIDATION.md) for manual checks.

## Architecture

One Next.js App Router application serves React/TypeScript UI and Node.js API
routes. Zod owns the application schema. Docker uses a multi-stage build and a
non-root standalone runtime. There is no database or second service.

```text
Text JSON / image multipart → /api/analyze → analysis service
                                             |
                                      LLMProvider interface
                                             |
                                       Gemini adapter
                                             |
                              validated HomeworkAnalysis JSON
                                             |
                                French + English + instructions

Word / sentence tap → SpeechProvider → browser speech synthesis
```

`LLM_PROVIDER` and `LLM_MODEL` select configuration. Gemini is implemented; OpenAI
and xAI/Grok are future adapters and produce a clear error if selected today.
Provider calls and keys remain under `src/server/`, guarded by `server-only`.
See [adapter instructions](src/server/llm/providers/README.md) for adding another
provider without changing result components.

```text
src/app/                 Page, layout, styles, analysis and health routes
src/components/          Homework form, original document, results, French controls
src/lib/homework/        Application-owned Zod schemas
src/lib/french/          Sentence spans and source-preserving word tokens
src/lib/speech/          Speech interface, browser adapter, React hook
src/server/homework/     Input validation, analysis service, process-local limits
src/server/llm/          Provider interface, factory, prompt, Gemini adapter
src/server/config.ts     Server-only environment configuration
src/types/               Shared inferred application types
tests/                   Synthetic fixtures, unit/API/DOM workflow tests
docs/                    Master requirements, approved plan, validation notes
```

`POST /api/analyze` accepts either `application/json` with `{ "text": "..." }`
or multipart form data with a single `image` file. JSON avoids multipart line-ending
normalization, so pasted French is preserved exactly. Both input paths return
`{ ok: true, data: HomeworkAnalysis }`, or a safe `{ ok: false, error: { code,
message } }` with an HTTP error status. The model returns structured data, never
application HTML. Word/sentence segmentation is deterministic application logic.

## Project documents and scope

- [Master specification](docs/PROJECT_SPEC.md): authoritative requirements, kept unchanged.
- [Approved implementation plan](docs/implementation-plan.md): architecture and phase gates.
- [Validation results](docs/VALIDATION.md): checks performed and remaining acceptance steps.

Accounts, history, flashcards, quizzes, a full tutor, cloud TTS, HEIC conversion,
and cloud deployment remain future work. A public deployment needs its own
authentication, access, retention, and children's privacy controls.
