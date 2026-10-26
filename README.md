# French Education Helper

Understand the homework. Practise the French.

A local web application for Grade 3 French Immersion students and their parents.
Paste French text or upload a teacher's homework note, compare the original with
a natural English translation and simple instructions, and tap French words or
sentences to hear them pronounced.

**Status:** V1 implementation is available. Automated tests, production builds,
Docker startup, and responsive browser checks have passed. Live text analysis
and answer feedback have been exercised with synthetic homework. Configure your
API key for a fresh installation; physical iPad/iPhone and audible-device checks
remain to be completed. See [validation results](docs/VALIDATION.md).

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
   LLM_MODEL=gemini-3.1-flash-lite
   GEMINI_API_KEY=your-api-key
   ```

   Obtain an API key through [Google AI Studio](https://aistudio.google.com/apikey).
   Do not paste your key into chat or commit it to Git. Model availability and
   quotas depend on your provider account. The model is configurable; the default
   is documented in [Google's model reference](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite).

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
   French words in the meanings list are also pronounceable. **Read the whole note
   in French** reads all instructions. The audio status reports start/completion
   and explains when a browser cannot start speech.
6. Write your response under **Your turn**, then choose **Check my answer**.
   One AI request checks the actual teacher requirements and gives kind, specific
   Grade 3 feedback. It does not submit while you type.
7. If revision is needed, try the customized exercise and choose **Check practice
   answer**, then revise and recheck the original task. Passing a practice exercise
   does not mark the original homework complete. Editing a checked answer clears
   its previous result.

As you write, **Listen to your answer** shows a pronounceable copy beneath the
editor. Tap any word, a sentence's speaker, or **Read my answer in French**.
The same controls apply to practice questions, practice answers, and French
examples/improved sentences supplied with feedback. Listening never submits or
grades the answer. A floating French audio player makes Stop and audio errors
available even when working lower down the page.

For example, a note asking for three sentences with “ballon” is checked for the
required sentences, vocabulary, and age-appropriate French. Unclear tasks or tasks
requiring missing material are referred to a parent rather than assigned a pass.
Feedback is an AI suggestion for practice, not a teacher's grade. Passing the
original task unlocks a short game for spelling, meanings, sentences and similar
French sounds. Create its content once; listening and marking do not call the AI.

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

## Learning history, marks and monthly review

Open **Learning history** to browse all saved notes grouped by household calendar
**date**, filter by month or exact date, and choose **Review & redo**. The saved
original image remains available for comparison. Earlier answers, practice tasks,
feedback and marks appear under **Every try counts**. **Redo teacher’s task**
starts a fresh answer without overwriting previous attempts. Work from before
history was implemented cannot be recovered automatically; new accepted notes are
saved from now on.

Homework marks are **requirements met / requirements checked** and a percentage.
Tasks needing parent review get no numerical mark. These AI practice marks are
not official school grades. A practice pass does not pass the original task.
Quiz marks are **answers correct / questions**; accents count in spelling. Every
quiz try is saved. French prompts, options, examples and marked answers have word
and sentence audio, and optional celebration sounds make the game playful.

Open **Monthly review** to choose a month, see notes/attempts/completed tasks and
the latest homework average, revisit words, and play or redo a summary quiz. New
quiz content uses the LLM once. Reloading saved reviews, listening, choosing
answers, and server-side marking require no AI calls. If more work has been added,
**Update monthly review** saves a new version; old versions and attempts remain.
Summaries use the 30 most recent notes with recent feedback; progress totals count
all notes in the selected month. Attempts redone later remain attached to their
original note's month.

The app checks hourly for completed calendar months with saved notes but no
monthly quiz, and catches up after startup. It creates a summary/quiz once for
each such month. Failed provider calls back off six hours and can be retried from
the page. The current month is available as a preview. The Mac and Docker must be
running; no job can execute during system sleep or shutdown. The automatic job
can consume configured provider quota, and never generates reviews for empty
months. Calendar grouping defaults to `America/Toronto` (`APP_TIMEZONE`). Set the
zone before collecting history; existing date/month keys remain unchanged.

## Saved data and backup

Docker Compose stores SQLite and original images in the named
`french-education-helper_learning_data` volume mounted at `/app/data`. Container
rebuilds and ordinary `docker compose down` preserve it. **Do not use `down -v`**
when you want to keep learning history. Local development uses ignored `./data/`,
or `DATA_DIR` if configured. Development and Docker have separate databases.

To make a consistent backup, briefly stop the app, copy the entire data directory
(including SQLite sidecars), and restart it. Use a new backup folder each time:

```sh
docker compose stop app
docker compose cp app:/app/data ../french-learning-backup-2026-10-25
docker compose start app
```

Keep the backup private because it contains homework and answers. To restore,
stop the app, copy the saved directory's contents into `/app/data/` in the existing
container, and start it. Preserve UID 1001 ownership and write access. Back up the
current data first. API keys are separate in `.env.local`; they are not in the
learning database or these backups.

## Pronunciation

Speech uses the browser's speech synthesis on demand, independently of the AI.
No LLM or app-server request is made when tapping a word or sentence, and no audio
files are generated during analysis. A replaceable `SpeechProvider` interface
keeps speech separate from the UI and LLM provider.

`FrenchAudioText` is the shared presentation component for French answers, samples,
and practice prompts; it uses `FrenchPassage` for token/sentence controls and the
shared `Pronunciation` context. Quiz prompts, French choices, model sentences and
marked answers use the same controls. Spelling targets use an audio-only Listen
button before marking so the visible prompt does not reveal the spelling.
Generated French example sentences are returned in the structured `frenchExamples`
field with their English translations, so they never rely on guessing which parts
of English feedback are French. Older feedback without this field is supported.

Canadian French (`fr-CA`) is preferred. If unavailable, another French voice is
used and the app explains the fallback. Install a Canadian French voice in your
device's speech/accessibility settings if necessary. Voice availability, audible
output, and whether a system voice uses an online service depend on the device.
Browsers without speech support show a message while text results remain usable.
All French controls within a result share one speech instance. A paused engine is
resumed on the next tap, and a six-second startup watchdog exposes silent failures.
See the browser's [paused speech behavior](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/paused).

## Limits and privacy

- Text: up to 10,000 JavaScript string characters.
- Images: JPEG, PNG, or WebP, up to 10 MiB; signatures and MIME types are checked.
- HEIC: export as JPEG/PNG or use a screenshot; automatic conversion is deferred.
- Request body: 12 MiB for uploads; JSON text bodies are bounded at 100,000 bytes.
- Reading the request: 15-second timeout. Provider call: 60-second timeout.
- One process handles up to 2 concurrent analyses and 20 requests per minute.

Accepted French-study notes, original images, explanations, checked answers,
marks, practice attempts and quizzes are saved in SQLite on the Mac. Unrelated
material is rejected with an explanation and is not retained. Responses are
uncached. Everyone who can reach this household app can view the shared history;
there are no separate student accounts. Submitted content is sent to the configured
AI provider; provider-side retention follows its own terms. Saved data is excluded
from Git and Docker builds. Automated tests use synthetic content and mocked providers.

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
non-root standalone runtime. SQLite uses Node.js 24's built-in `node:sqlite` module;
there is still one container and no separate database service. This Node API is
currently marked experimental, so use the pinned Node major and back up saved work.

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
src/app/                 Homework, history, monthly review and bounded API routes
src/components/          Homework form, original document, results, French controls
src/lib/homework/        Application-owned homework/review schemas
src/lib/learning/        Quiz schemas, deterministic grading and shared record types
src/lib/french/          Sentence spans and source-preserving word tokens
src/lib/speech/          Speech interface, browser adapter, React hook
src/server/homework/     Input validation, analysis service, process-local limits
src/server/llm/          Provider interface, factory, prompt, Gemini adapter
src/server/learning/     SQLite persistence, calendar keys, quiz service, monthly job
src/instrumentation.ts   Starts the in-process monthly catch-up scheduler
src/server/config.ts     Server-only environment configuration
src/types/               Shared inferred application types
tests/                   Synthetic fixtures, unit/API/DOM workflow tests
docs/                    Master requirements, approved plan, validation notes
```

`POST /api/analyze` accepts either `application/json` with `{ "text": "..." }`
or multipart form data with a single `image` file. JSON avoids multipart line-ending
normalization, so pasted French is preserved exactly. Both input paths return
`{ ok: true, data: HomeworkAnalysis, lessonId }`, or a safe `{ ok: false, error: { code,
message } }` with an HTTP error status. The model returns structured data, never
application HTML. Word/sentence segmentation is deterministic application logic.

`POST /api/review` accepts JSON `{ originalFrench, answer, lessonId?, parentAttemptId? }`.
Saved attempts use the server-owned task and return an `attemptId`; practice
references must belong to that saved lesson. The provider returns
validated requirements, strengths, improvements, and one targeted practice task
when needed. Review states are `passed`, `needs_work`, or `needs_parent_review`.
Passing requires all reported teacher requirements to be met. Both API routes
share process-local limits and keep credentials/server prompts out of browser code.

## Project documents and scope

- [Master specification](docs/PROJECT_SPEC.md): authoritative requirements, kept unchanged.
- [Approved implementation plan](docs/implementation-plan.md): architecture and phase gates.
- [Validation results](docs/VALIDATION.md): checks performed and remaining acceptance steps.
- [Learning extension](docs/learning-history-plan.md): saved history, games and monthly review.

`GET /api/history?month=YYYY-MM&date=YYYY-MM-DD` retrieves grouped record metadata;
`GET /api/history/:id` returns a saved lesson, attempts and quizzes. Original images
use `/api/history/:id/image`. `POST /api/quiz` prepares or reopens a lesson/monthly
pack, and `POST /api/quiz/:id/attempts` marks it against the saved server-side key.
`GET /api/monthly?month=YYYY-MM` returns monthly progress and saved quiz versions.

Accounts, flashcards, a full tutor, cloud TTS, HEIC conversion, speech-recognition
scoring, working OpenAI/xAI adapters and cloud deployment remain future work. A public deployment needs its own
authentication, access, retention, and children's privacy controls.
