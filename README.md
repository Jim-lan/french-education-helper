# French Education Helper

Understand the homework. Practise the French.

A local web application for Grade 3 French Immersion students and their parents.
Paste French text or upload a teacher's homework note, compare the original with
a natural English translation and simple instructions, and tap French words or
sentences to hear them pronounced.

**Delivery status:** the requested local learning workflow is implemented: text/photo
analysis, French pronunciation, answer checking and practice, saved history/marks,
redo, lesson games and monthly summary quizzes. The application uses a Linux
Docker container and is designed for **macOS, Windows and Linux hosts**. Physical
Windows/Linux-host and iPad/iPhone acceptance checks are recorded separately from
container checks in [VALIDATION.md](docs/VALIDATION.md). OpenAI/xAI adapters, HEIC
conversion, accounts and cloud publishing remain future scope.

## Install and run — step by step

The recommended installation uses Docker. **You do not need to install Node.js,
npm, SQLite or an LLM SDK on the host computer.** Internet access is required for
the first image build and for new Gemini requests. Each computer you install on
has its own learning database; devices using the same server share its history.

### 1. Install and start Docker

| Host computer                  | Install                                                                                                                                                  | Terminal to use |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| macOS (Apple silicon or Intel) | [Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/)                                                                     | Terminal        |
| Windows                        | [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/), following its WSL 2 requirements; use **Linux containers** | PowerShell      |
| Linux                          | [Docker Engine](https://docs.docker.com/engine/install/) with the [Compose plugin](https://docs.docker.com/compose/install/linux/), or Docker Desktop    | Terminal        |

Start Docker Desktop and wait for its engine to be ready. On a Linux Engine
installation, ensure the Docker service is running and your user can run Docker
according to the official installation instructions. Check:

```sh
docker version
docker compose version
```

Use Docker Compose **2.24 or newer**. Docker Desktop includes Compose. If Docker
cannot connect, start the engine before continuing. Docker Desktop's supported OS
versions and licensing are described in the installation links above.

### 2. Get the application

**Option A — installation ZIP:** extract the supplied
`french-education-helper-<version>-<commit>.zip`, then open a terminal in its
`french-education-helper` folder. Keep this folder for configuration and updates.
The ZIP includes application source, Docker configuration and launch scripts;
Docker builds the application on first start. It contains no API keys or homework.

**Option B — Git:** if Git is installed, run:

```sh
git clone https://github.com/Jim-lan/french-education-helper.git
cd french-education-helper
```

If you already have this project, use your existing folder and skip cloning.

### 3. Create your private configuration

If `.env.local` already exists, **keep it** and skip the copy command.

macOS / Linux:

```sh
cp .env.example .env.local
chmod 600 .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Open `.env.local` in a local text editor, for example `nano .env.local` on
macOS/Linux or `notepad .env.local` on Windows. Enter:

```dotenv
LLM_PROVIDER=gemini
LLM_MODEL=gemini-3.1-flash-lite
GEMINI_API_KEY=your-actual-api-key
APP_TIMEZONE=America/Toronto
```

Obtain a key at [Google AI Studio](https://aistudio.google.com/apikey). Save the
file as exactly `.env.local`, not `.env.local.txt`. Do not paste the key into chat
or commit it to Git. The existing installation's configured key is not included
in Git or installation bundles. Model availability and quota depend on your
provider account; [the default model reference](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite)
describes the configured model. Set your household time zone before adding notes.

### 4. Build and start

Run the same command on all three operating systems:

```sh
docker compose up --build -d --wait --wait-timeout 120
```

The first build downloads dependencies and may take several minutes. This runs
one app container and creates persistent learning storage. Subsequent starts
reuse the image and database. The Compose project is explicitly named
`french-education-helper`, so extracting an update into a differently named
folder does not silently select a different database on the same Docker engine.

Convenience launchers perform the same startup from any working directory:

```sh
# macOS / Linux, from the project folder
sh scripts/start.sh
```

```powershell
# Windows, from the project folder
.\scripts\start.ps1
```

If PowerShell execution policy blocks the optional script, use the direct Docker
command above; no execution-policy change is required.
The launchers preserve existing configuration. If `.env.local` is missing, they
create a blank template and stop so you can add the API key before starting.

### 5. Confirm it is running

```sh
docker compose ps
```

The `app` service should show **healthy**. Open these pages on the server computer:

- [New homework](http://localhost:3000/)
- [Learning history](http://localhost:3000/history)
- [Monthly review](http://localhost:3000/monthly)
- [Health endpoint](http://localhost:3000/api/health) — returns `{"status":"ok"}`

A healthy container verifies the web server; it does not validate the API key or
consume AI quota. Choose **Try this note → Help me understand** to check Gemini.
Write an answer and check it, then open history to confirm it is saved. Try a
JPEG/PNG homework image and French word/sentence audio as the final device check.

### 6. Connect a phone, iPad or another computer

Connect the client device to the same home network as the server. Find the
**server computer's home-network IPv4 address**:

| Server OS | Find its address                                                               |
| --------- | ------------------------------------------------------------------------------ |
| macOS     | System Settings → Network/Wi-Fi → connection details → TCP/IP                  |
| Windows   | Run `ipconfig`; find the IPv4 address for the connected Wi-Fi/Ethernet adapter |
| Linux     | Run `ip -4 addr`; use the address on the connected Wi-Fi/Ethernet interface    |

On the client device, open:

```text
http://<server-IP-address>:3000
```

For example, if the server address is `192.168.1.20`, use
`http://192.168.1.20:3000`. `localhost` on a phone points to the phone itself.
Use the same server address to access the same shared history from every device.

The app binds to `0.0.0.0:3000`. Allow access on your trusted home/private network
if the host firewall prompts; guest Wi-Fi and client isolation can block it.
**The server computer must remain awake with Docker running.** The screen may be
off or locked. Monthly jobs catch up after downtime. This installation is for a
trusted household network; do not expose port 3000 to the public internet.

On iPhone/iPad, upload from Photo Library, Take Photo, or Choose Files as offered
by the device. Photos are in Photos; downloaded images are usually in Files.
The app accepts JPEG/PNG/WebP; create a compatible copy if the file is HEIC or PDF.
A saved accepted note is stored on the server, regardless of which device uploads it.

### 7. Stop, restart and update

These commands work from the project folder on macOS, Windows and Linux:

```sh
# Stop temporarily; keep the container and history
docker compose stop

# Resume
docker compose start

# Inspect startup errors
docker compose logs --tail=50 app

# Stop and remove the container; preserve the learning volume
docker compose down
```

For a Git installation, save any local code edits and update with:

```sh
git pull --ff-only
docker compose up --build -d --wait --wait-timeout 120
```

For a ZIP installation, extract the new bundle, copy your existing `.env.local`
into the new project folder, and run the startup command there on the same Docker
engine. Keep the configuration private. The named learning volume remains shared
with the previous installation on that engine. Moving to another computer requires
transferring a database backup and configuring the key there separately.

After changing only credentials or model configuration:

```sh
docker compose up -d --force-recreate --wait --wait-timeout 120
```

**Do not run `docker compose down -v` when you want to keep history.** It removes
the learning volume. See the backup instructions below before moving computers.

### Troubleshooting

| Symptom                             | What to check                                                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Cannot connect to Docker            | Start Docker Desktop or the Linux Docker service; check `docker info`                                                  |
| Compose rejects `env_file.required` | Update Docker Desktop / Compose to 2.24 or newer                                                                       |
| Port 3000 is already in use         | Stop the other app using it; this project expects port 3000                                                            |
| Healthy app, but AI fails           | Check the server-side key, model, internet access and provider quota; recreate the container after configuration edits |
| Phone cannot connect                | Use the server's LAN address, keep the host awake, check private-network firewall access and Wi-Fi isolation           |
| Windows image/OS mismatch           | Select Linux containers in Docker Desktop                                                                              |
| No French sound                     | Check device volume and French speech voices; try Safari/Chrome and verify fr-CA support                               |
| History seems missing after moving  | Confirm the same Docker engine/project volume is used, or restore the old server's backup                              |

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

Docker Compose stores SQLite and original images on the server computer in the named
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
marks, practice attempts and quizzes are saved in SQLite on the server computer. Unrelated
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

## Creating an installation bundle

Maintainers with Git and Node.js 24 can package a **committed** revision:

```sh
npm run package:install
```

This creates a versioned ZIP, SHA-256 checksum and revision manifest in ignored
`dist/`. Packaging reads a fixed allowlist of files from Git HEAD, so untracked
configuration, local databases, uploads and build artifacts are excluded. Commit
changes first. Recipients only need Docker, the ZIP and their own API key; Node.js
is needed for creating a bundle, not installing it. This is a Docker installation
bundle, not a native `.dmg`/`.exe` installer or a prebuilt offline image.

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
