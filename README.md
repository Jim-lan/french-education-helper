# French Education Helper

Understand the homework. Practise the French.

French Education Helper is a planned web application for Grade 3 French
Immersion students and their parents. Paste French text or upload a teacher's
homework note, then read the French alongside a natural English translation and
simple instructions explaining what the teacher wants. Tap a French word or a
sentence to hear it pronounced, with Canadian French (`fr-CA`) preferred.

## Project status

**Planning stage — application implementation is awaiting approval.**

This GitHub repository currently contains the master specification, proposed
implementation plan, and this README. A preliminary application scaffold exists
in the local development workspace but has not been committed. A fresh clone
cannot run the application yet.

| Document | Purpose |
| --- | --- |
| [Master specification](docs/PROJECT_SPEC.md) | Authoritative product requirements, architecture, and V1 definition of done |
| [Implementation plan](docs/implementation-plan.md) | Section 34 proposal: schemas, interfaces, directory structure, risks, decisions, and incremental phases |

## What V1 will do

- Accept pasted French text or an uploaded homework image.
- Preserve pasted text exactly and transcribe readable French from images.
- Keep the original uploaded image visible for comparison with the AI interpretation.
- Show a natural English translation and a separate, Grade 3-friendly explanation.
- Make French words tappable and provide a speaker control for complete sentences.
- Prefer Canadian French pronunciation using browser speech synthesis.
- Work on a Mac, iPad, iPhone, or another computer on the same home Wi-Fi.

JPEG, PNG, and WebP are proposed for initial image support. HEIC conversion can
be revisited later. Unclear handwriting or extraction should be flagged rather
than silently guessed. The teacher's actual document remains the source of truth.

## Example

**Teacher's French**

> Écris trois phrases avec le mot « ballon ».

**English translation**

> Write three sentences using the word “ballon.”

**What do I need to do?**

> Write 3 French sentences. Use the word “ballon” as instructed.

The student will be able to tap **ballon** to hear the word or use the sentence
speaker to hear the complete instruction.

## Planned architecture

One Next.js application will serve the React interface and server API from one
Docker container. TypeScript and an application-owned Zod schema will define and
validate the structured homework response. Lightweight CSS will provide a
responsive layout.

```text
Browser: paste text / upload image
                |
                v
       Next.js analysis API
                |
                v
    Homework analysis service
                |
                v
       LLM provider interface
                |
                v
       Gemini adapter (V1)
                |
                v
 Validated French / English / explanation JSON
                |
                v
       Responsive React results

Word or sentence tap
        |
        v
 Speech provider interface
        |
        v
 Browser speech synthesis (fr-CA preferred)
```

Gemini will be the first working AI provider. OpenAI and xAI/Grok can be added
through adapters without rewriting the UI or homework business logic. The model
will return structured data; React will render the interface.

Pronunciation will operate independently of the LLM. Word and sentence taps will
use browser speech synthesis on demand, with no LLM call or pre-generated audio
files. Available French voices depend on the device; the app will explain a
fallback if a Canadian French voice is unavailable.

## Planned local setup

These are the intended commands **after the application is implemented and
committed**. They do not work from the documentation-only repository today.

### Docker

With Docker Desktop running and the selected provider configured:

```sh
docker compose up -d
```

After code changes, rebuild with:

```sh
docker compose up --build -d
```

Open `http://localhost:3000` on the Mac. On another device connected to the same
Wi-Fi, open `http://<Mac-Wi-Fi-IP>:3000`.

The application will listen on `0.0.0.0:3000`. Find the Mac's Wi-Fi IP address
in System Settings → Wi-Fi → Details → TCP/IP. The firewall must allow incoming
connections, and the network must allow devices to communicate with one another.

The Mac must remain awake with Docker running. Its display can be off and the
computer can be locked, but system sleep or shutdown makes the app unavailable.

Stop the application with:

```sh
docker compose down
```

### Development

The proposed development runtime is Node.js 24. Once the application files are
committed, the intended workflow is:

```sh
npm ci
npm run dev
```

TypeScript and production build checks will use:

```sh
npm run typecheck
npm run build
```

The app will run locally, while AI analysis will require internet access to the
configured provider.

## Configuration and privacy

The implementation plan proposes server-side configuration such as:

```dotenv
LLM_PROVIDER=gemini
LLM_MODEL=<supported-multimodal-model>
GEMINI_API_KEY=<your-api-key>
```

The planned `.env.example` will contain placeholders only. Real credentials will
go in an ignored `.env.local` file and be supplied to the container at runtime.
The preliminary local scaffold uses `GEMINI_MODEL`; Phase 0 will reconcile that
with the proposed generic `LLM_MODEL` setting.

API keys must remain server-side and must never be committed, placed in browser
JavaScript, prefixed with `NEXT_PUBLIC_`, or included in responses or logs. The
app will use provider APIs; it will not request consumer AI account passwords or
automate login to AI websites.

V1 will process notes and images temporarily without saved homework history or a
database. Submitted content will be sent to the configured AI provider, whose
own retention terms apply. Private homework, real API keys, and student documents
must not be added to this public repository. Automated tests will use synthetic
fixtures and mock providers.

V1 is intended for a trusted home network. Public deployment, authentication,
and the additional privacy controls required for public access are future work.

## Implementation phases

| Phase | Deliverable |
| --- | --- |
| 0 — Foundation | Reconcile the local scaffold, configuration, schema, and development tooling |
| 1 — Text workflow | Paste French → Gemini analysis → validated French, English, and simple instructions |
| 2 — Pronunciation | Tappable words, sentence speakers, and independent browser speech synthesis |
| 3 — Image workflow | Upload images, retain the visible original, and reuse the same analysis/result schema |
| 4 — Docker | Verify one-container startup and access from another home Wi-Fi device |
| 5 — Provider verification | Confirm Gemini isolation and document how to add another provider |
| 6 — Polish | Refine loading, errors, French tokenization, accessibility, and mobile/iPad layouts |

The [implementation plan](docs/implementation-plan.md) defines the verification
gates for each phase. Approval is required before starting Phase 0/Phase 1.

## V1 completion criteria

A parent or child can start the app with Docker, paste French or upload a
homework photo, compare the interpretation with the original source, read the
translation and simple explanation, and hear individual words or whole sentences.
The same workflow must work from another device on the home Wi-Fi, while provider
credentials remain on the server and Gemini remains replaceable through its
adapter interface.

Accounts, homework history, flashcards, quizzes, a full tutor, cloud TTS, and cloud
deployment are outside initial V1 scope.
