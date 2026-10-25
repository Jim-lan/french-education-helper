# French Education Helper
## Product Requirements, Architecture, and Implementation Specification

**Project status:** Initial design / pre-implementation  
**Initial target:** Local Docker deployment on macOS  
**Primary user:** Grade 3 French Immersion student and parent  
**Initial language:** French → English  
**Primary French locale:** Canadian French (`fr-CA`)

---

# 1. Product Vision

Build a simple web-based French education assistant primarily for a Grade 3 French Immersion student.

The typical input is a photograph or screenshot of a teacher's French homework note, worksheet, vocabulary list, sentence, or instructions. The application should understand the French content, preserve the original French, translate and explain it in English, and allow the student or parent to hear French words and sentences pronounced.

The application should initially run locally on a MacBook Pro using Docker and be accessible from other devices on the same home Wi-Fi network, including iPads, iPhones, and other computers.

The architecture must also allow the application to be deployed online later without requiring a major rewrite.

The application should deliberately remain simple in V1. Do not introduce unnecessary enterprise infrastructure.

---

# 2. Primary User Scenario

A Grade 3 French Immersion teacher provides homework such as:

> Écris trois phrases avec le mot « ballon ».

The parent/student uploads a photo or screenshot of the homework.

The application displays:

### Original French

Écris trois phrases avec le mot « ballon ».

### English Translation

Write three sentences using the word "ballon."

### What does my teacher want me to do?

Write 3 French sentences. Use the word "ballon" as instructed.

The French text remains interactive.

The student can:

- tap/click `ballon` to hear the word;
- tap/click another French word to hear it;
- tap a speaker icon beside the sentence to hear the entire sentence.

The application should work well with mouse and touch interfaces.

---

# 3. V1 Functional Requirements

V1 should focus on the following capabilities.

## 3.1 Input

Support two input methods:

### A. Paste French text

The user can paste French text directly into a text area.

### B. Upload an image

Support common image formats such as:

- JPG/JPEG
- PNG
- HEIC if practical

The image may contain:

- printed French;
- teacher instructions;
- vocabulary lists;
- sentences;
- worksheets;
- handwriting;
- highlighted/circled words;
- mixed French and English;
- tables or simple worksheet layouts.

The system should use multimodal AI capabilities rather than relying exclusively on traditional OCR.

---

# 4. Preserve the Original Source

This is an important design principle.

The original uploaded homework image is the source of truth.

The application should keep the uploaded image visible so the parent/student can compare the AI interpretation against the teacher's actual document.

Conceptually:

    ORIGINAL DOCUMENT | AI INTERPRETATION

The application must not silently make the AI-generated reconstruction appear to be the authoritative original.

When extraction is uncertain, the architecture should allow uncertainty to be surfaced later.

---

# 5. AI Processing

For each input, the AI should perform three primary tasks.

## 5.1 Extract/preserve French

Identify the relevant French text.

Preserve:

- accents;
- punctuation;
- capitalization;
- sentence boundaries;
- wording;
- spelling;

as closely as possible.

Do not unnecessarily "correct" teacher-provided text.

## 5.2 English translation

Provide a natural English translation.

The translation should prioritize meaning over mechanically literal word-for-word translation.

## 5.3 Student-friendly instruction

Explain what the teacher wants the student to do.

This should be:

- simple;
- concise;
- appropriate for approximately Grade 3;
- understandable by a parent and child.

Example:

French:

    Conjugue le verbe avoir au présent.

English:

    Conjugate the verb "avoir" in the present tense.

Student explanation:

    Fill in the present-tense forms of "avoir."

The AI should understand the educational instruction rather than behave only as an OCR/translation engine.

---

# 6. Structured AI Response

Do NOT ask the LLM to generate application HTML.

The LLM must return structured data.

Define a stable application-owned schema.

An initial conceptual structure may resemble:

    {
      "original_french": "Écris trois phrases avec le mot ballon.",
      "english_translation": "Write three sentences using the word ballon.",
      "student_explanation": "Write 3 French sentences using the word ballon.",
      "sentences": [
        {
          "text": "Écris trois phrases avec le mot ballon.",
          "words": [
            "Écris",
            "trois",
            "phrases",
            "avec",
            "le",
            "mot",
            "ballon"
          ]
        }
      ]
    }

The implementation may improve this schema.

Use a schema validation mechanism such as Zod.

The application's internal schema belongs to the application, not to any LLM provider.

Provider-specific output must be normalized into this schema.

---

# 7. Interactive French Text

French text must be rendered as interactive tokens.

Individual words should be clickable/tappable.

For example:

    Écris | trois | phrases | avec | le | mot | ballon

Clicking/tapping a word should pronounce that word.

The interface must work well with:

- MacBook mouse/trackpad;
- iPad;
- iPhone;
- touch-screen devices.

Touch targets should be reasonably large for children.

Punctuation should be handled cleanly and should not interfere with pronunciation.

Apostrophes and contractions such as:

    l'école
    j'aime
    c'est

must be tokenized sensibly.

---

# 8. Sentence Pronunciation

Each French sentence should also provide a speaker control.

Example:

    🔊 Écris trois phrases avec le mot ballon.

Selecting the sentence speaker should pronounce the entire French sentence naturally.

---

# 9. Pronunciation Architecture

Pronunciation must be independent from the LLM.

Do NOT send a request to Gemini/OpenAI/Grok every time a child clicks a word.

For V1 use browser speech synthesis where supported.

Conceptually:

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-CA";
    speechSynthesis.speak(utterance);

Canadian French (`fr-CA`) should be the default locale because the target environment is Canadian French Immersion.

The pronunciation layer should nevertheless be abstract enough to replace browser speech synthesis later with a neural TTS provider if needed.

Conceptual interface:

    SpeechProvider
        |
        +-- BrowserSpeechProvider      V1
        |
        +-- CloudTTSProvider           Future

The UI should not need major changes when TTS providers change.

---

# 10. Performance Requirement

The user experience should feel fast.

Do NOT generate audio files for every word when a homework document is uploaded.

The preferred flow is:

    Upload
       ↓
    AI analysis
       ↓
    Structured response
       ↓
    Render page immediately
       ↓
    User clicks word
       ↓
    Pronounce word on demand

With browser speech synthesis, pronunciation should normally require no backend request.

If cloud TTS is introduced later, audio should be generated on demand and cached where appropriate.

---

# 11. LLM Provider Independence

This is a major architectural requirement.

The application must NOT be tightly coupled to Gemini, OpenAI, Grok, or another provider.

Create an application-level LLM abstraction.

Conceptually:

                    Homework Application
                            |
                            v
                      LLM Service
                   analyzeHomework()
                            |
              +-------------+-------------+
              |             |             |
              v             v             v
          Gemini         OpenAI          Grok
          Adapter        Adapter         Adapter

A conceptual TypeScript interface might resemble:

    interface LLMProvider {
        analyzeHomework(
            input: HomeworkInput
        ): Promise<HomeworkAnalysis>;
    }

The exact interface may be improved during implementation.

Application components must call the abstraction rather than provider SDKs directly.

Provider-specific SDK calls should remain inside provider adapters.

---

# 12. Initial LLM Provider

Start with Gemini as the initial implementation because the project owner wants the ability to begin with a low-cost/free-tier-oriented option.

However:

Gemini must NOT become embedded throughout the application architecture.

Expected organization could resemble:

    lib/
      ai/
        types.ts
        schema.ts
        provider.ts
        provider-factory.ts

        providers/
          gemini.ts
          openai.ts
          grok.ts

Initially:

- Gemini adapter: implemented
- OpenAI adapter: architecture prepared / implement later
- Grok adapter: architecture prepared / implement later

Do not build unnecessary fake provider implementations simply to create files.

---

# 13. Provider and Model Switching

The architecture must support easy switching of both:

- AI provider;
- model.

For example:

    Gemini
       └── Gemini Flash / selected Gemini model

    OpenAI
       └── selected OpenAI multimodal model

    xAI
       └── selected Grok model

Initially configuration may use environment variables:

    LLM_PROVIDER=gemini
    LLM_MODEL=<configured-model>

Later add an application Settings page such as:

    AI Provider
    [ Gemini ▼ ]

    Model
    [ selected model ▼ ]

    Gemini    ✓ configured
    OpenAI    Not configured
    Grok      Not configured

Changing the provider should not require rewriting application business logic.

---

# 14. API Credentials and Security

Never store ChatGPT, Gemini, Grok, or other service usernames/passwords in the application.

Never automate login to consumer AI websites.

Do not store credentials in source code.

Do not expose LLM API keys to browser-side JavaScript.

Provider credentials must remain server-side.

Local development should use environment variables or equivalent secret configuration.

Example:

    GEMINI_API_KEY=...
    OPENAI_API_KEY=...
    XAI_API_KEY=...

Provide:

    .env.example

with placeholders only.

Actual:

    .env.local

or equivalent must be excluded from Git.

`.gitignore` must protect secret files.

The application should fail clearly if the selected provider has not been configured.

---

# 15. ChatGPT Account vs API

Do not assume that a consumer ChatGPT login can simply be embedded into this application.

The application architecture should support proper provider authentication mechanisms.

Do not ask for or store the user's ChatGPT username/password.

Provider authentication should be isolated behind provider adapters so authentication approaches can evolve later.

---

# 16. Technology Stack

Prefer a simple single-application architecture for V1.

Recommended:

- Next.js
- React
- TypeScript
- server-side Next.js API routes / server actions as appropriate
- Tailwind CSS or similarly lightweight styling
- Zod for schema validation
- browser Web Speech API for V1 pronunciation
- SQLite only if persistent storage becomes necessary
- Docker
- Docker Compose

Do NOT introduce Python/FastAPI for V1 unless a concrete requirement makes Python necessary.

Do NOT introduce:

- Kubernetes;
- Kafka;
- vector databases;
- RAG;
- agent frameworks;
- microservices;

unless later requirements genuinely justify them.

Keep V1 maintainable by one person.

---

# 17. Logical Architecture

The desired architecture is approximately:

    ┌─────────────────────────────────────────┐
    │               Browser                   │
    │                                         │
    │  Mac / iPad / iPhone / other device    │
    │                                         │
    │  Next.js / React UI                     │
    │  - image upload                         │
    │  - pasted text                          │
    │  - original image                       │
    │  - French                               │
    │  - English                              │
    │  - clickable French words               │
    │  - sentence speaker                     │
    │                                         │
    │  Browser Speech Synthesis (fr-CA)       │
    └────────────────┬────────────────────────┘
                     │
                     │ HTTP
                     ▼
    ┌─────────────────────────────────────────┐
    │          Next.js Server Layer           │
    │                                         │
    │       Homework Analysis Service         │
    │                  │                      │
    │             LLM Router                  │
    │          /       │       \              │
    │     Gemini    OpenAI     Grok           │
    │                                         │
    │        Structured Homework JSON         │
    └─────────────────────────────────────────┘

Pronunciation should normally remain entirely browser-side in V1.

---

# 18. Local Docker Deployment

The initial application runs on a MacBook Pro.

Docker should make installation and operation simple.

Target command:

    docker compose up -d

The web server must bind to:

    0.0.0.0

rather than only:

    localhost

so other devices on the same Wi-Fi network can access it.

Expected access:

    MacBook
       |
       +-- iPad
       +-- iPhone
       +-- another computer

The README should explain how to determine the Mac's local IP address and connect using something similar to:

    http://192.168.x.x:3000

Do not hard-code a specific local IP address.

---

# 19. MacBook Availability Constraint

Document this clearly.

Docker can run in the background while the user is not actively using the Mac.

The display may be off and the computer may be locked.

However, the Mac itself must remain awake.

If macOS puts the MacBook into system sleep, the application will not be available to other devices.

If the Mac is shut down, the application is unavailable.

Future cloud deployment removes this dependency.

---

# 20. Online Deployment — Future

Do not implement cloud deployment as part of the first milestone unless necessary.

However, design V1 so that the same application can later be deployed online.

Potential future URL:

    https://french.example.com

When deployed publicly, authentication and appropriate privacy/security controls must be added because uploaded homework may contain children's educational information.

Do not expose uploaded documents publicly.

---

# 21. Initial UI Concept

Keep the UI child- and parent-friendly.

A conceptual desktop view:

    ┌──────────────────────────────────────────────┐
    │ French Homework Helper                       │
    ├──────────────────────────────────────────────┤
    │                                              │
    │     Upload Homework                          │
    │     or paste French text                     │
    │                                              │
    ├──────────────────────────────────────────────┤
    │ ORIGINAL DOCUMENT                            │
    │ [uploaded image]                             │
    ├──────────────────────────────────────────────┤
    │ TEACHER'S FRENCH                             │
    │                                              │
    │ 🔊 Écris trois phrases avec le mot ballon.   │
    │                                              │
    │ Individual words are clickable               │
    ├──────────────────────────────────────────────┤
    │ ENGLISH                                      │
    │                                              │
    │ Write three sentences using the word ballon. │
    ├──────────────────────────────────────────────┤
    │ WHAT DO I NEED TO DO?                        │
    │                                              │
    │ Write 3 French sentences.                    │
    │ Use "ballon" as instructed.                  │
    └──────────────────────────────────────────────┘

On smaller screens, sections should stack vertically.

The application must be responsive.

---

# 22. Word Interaction

For V1:

    ballon
       |
       +-- 🔊 Hear

Future:

    ballon
       |
       +-- 🔊 Hear
       +-- Meaning
       +-- Explain
       +-- Example
       +-- Practice

Design the component so these future actions can be added without rebuilding the French text renderer.

---

# 23. Future Word Explanation

Not required for initial V1, but architecture should anticipate it.

When the student selects a word, future functionality may provide:

- English meaning;
- simple French definition;
- part of speech;
- gender for nouns;
- verb information;
- Grade-appropriate explanation;
- example sentence;
- English translation of example;
- pronunciation of example sentence.

Example:

    ballon

    Meaning:
    ball / balloon

    Example:
    Le garçon joue avec un ballon.

    English:
    The boy plays with a ball.

    🔊 Hear example

Do not implement the complete tutoring system before the basic workflow is stable.

---

# 24. Future Learning Features

Potential future capabilities include:

- vocabulary history;
- saved words;
- flashcards;
- spelling practice;
- pronunciation practice;
- generated Grade 3 example sentences;
- quizzes;
- homework history;
- grammar explanations;
- parent mode;
- student mode.

These are explicitly future scope.

Do not allow them to complicate V1.

---

# 25. Error Handling

Provide child/parent-friendly errors.

Examples:

### Image cannot be understood

    I couldn't clearly read this homework.
    Try taking a clearer picture.

### Provider unavailable

    The AI service is temporarily unavailable.
    Please try again.

### API key missing

For the parent/admin:

    Gemini is selected but has not been configured.

Do not expose raw provider stack traces or API credentials to the browser.

Server logs may contain technical diagnostic information but must not log secrets.

---

# 26. Loading Experience

AI processing may take several seconds.

Show clear progress such as:

    Reading the homework...

then:

    Understanding the French...

Avoid unnecessary artificial steps if the operation is already complete.

Do not block pronunciation once analysis has been rendered.

---

# 27. Data and Privacy

For V1 local deployment:

Prefer minimal retention.

Do not permanently save uploaded homework unless required.

Temporary processing should be sufficient initially.

If history/storage is later introduced, make retention explicit.

Never store API credentials alongside homework data.

Future public deployment must revisit:

- authentication;
- authorization;
- retention;
- children's privacy;
- upload security;
- rate limiting.

---

# 28. Suggested Project Structure

Codex may improve this, but a reasonable starting structure is:

    french-education-helper/
    │
    ├── app/
    │   ├── api/
    │   │   └── analyze/
    │   ├── settings/
    │   └── page.tsx
    │
    ├── components/
    │   ├── HomeworkUpload.tsx
    │   ├── OriginalDocument.tsx
    │   ├── FrenchText.tsx
    │   ├── FrenchWord.tsx
    │   ├── SentenceSpeaker.tsx
    │   ├── Translation.tsx
    │   └── StudentExplanation.tsx
    │
    ├── lib/
    │   ├── ai/
    │   │   ├── provider.ts
    │   │   ├── provider-factory.ts
    │   │   ├── schema.ts
    │   │   └── providers/
    │   │       └── gemini.ts
    │   │
    │   └── speech/
    │       └── browser-speech.ts
    │
    ├── docs/
    │   └── PROJECT_SPEC.md
    │
    ├── public/
    │
    ├── .env.example
    ├── .gitignore
    ├── Dockerfile
    ├── docker-compose.yml
    ├── package.json
    └── README.md

Do not treat this structure as immutable if Next.js conventions suggest something cleaner.

Preserve the architectural boundaries.

---

# 29. Development Strategy

Do NOT attempt to implement every feature in one giant pass.

Use incremental phases.

## Phase 0 — Foundation

Create:

- Next.js;
- React;
- TypeScript;
- basic responsive UI;
- Git repository;
- environment configuration;
- project documentation.

No AI complexity yet.

## Phase 1 — Text workflow

Implement:

    Paste French
        ↓
    LLM analysis
        ↓
    structured JSON
        ↓
    French
    English
    student explanation

This should work before image processing.

## Phase 2 — Pronunciation

Implement:

- clickable French words;
- `fr-CA` browser speech synthesis;
- complete sentence pronunciation;
- touch support.

Verify pronunciation does not call the LLM.

## Phase 3 — Image workflow

Implement:

    Upload homework image
            ↓
    Gemini multimodal analysis
            ↓
    same HomeworkAnalysis schema
            ↓
    existing rendering components

The UI should not care whether the source was pasted text or an image.

## Phase 4 — Docker

Create:

- Dockerfile;
- docker-compose.yml;
- `0.0.0.0` binding;
- environment-variable handling;
- health/startup documentation.

Verify another device on the home Wi-Fi can access the application.

## Phase 5 — Provider abstraction verification

Ensure Gemini implementation is isolated.

Demonstrate that another provider could be added without modifying UI/business components.

Do not necessarily implement all providers yet.

## Phase 6 — Polish

Improve:

- loading;
- errors;
- mobile/iPad UI;
- tokenization;
- French contractions;
- image presentation;
- accessibility.

---

# 30. Testing Strategy

At minimum provide tests for important application logic.

Particularly:

- HomeworkAnalysis schema validation;
- French tokenization;
- contractions/apostrophes;
- provider selection;
- missing provider configuration;
- malformed LLM response;
- text input validation.

Where appropriate, use mock providers so tests do not consume real API quota.

Do not make automated tests dependent on live Gemini/OpenAI/Grok calls.

---

# 31. Development Principles

Follow these principles throughout the project.

### Principle 1 — Original source is authoritative

The teacher's uploaded document remains visible and is the source of truth.

### Principle 2 — Provider independence

No provider-specific code in UI/business components.

### Principle 3 — Structured AI output

LLM output is data, not UI.

### Principle 4 — Fast interaction

Do not call the LLM for operations that don't require intelligence.

### Principle 5 — Pronunciation is independent

TTS is separate from LLM analysis.

### Principle 6 — Start simple

Do not introduce infrastructure without a concrete need.

### Principle 7 — Child-friendly

The student should be able to tap words easily on an iPad.

### Principle 8 — Parent-verifiable

AI interpretations should be easy to compare with the original homework.

### Principle 9 — Secrets stay server-side

Never expose provider credentials to browser code.

### Principle 10 — Local first, cloud ready

V1 runs locally but should not require architectural replacement to deploy online later.

---

# 32. Important Non-Goals for V1

Do NOT initially build:

- full AI tutor;
- autonomous agents;
- RAG;
- vector database;
- user accounts;
- cloud deployment;
- complex database;
- flashcard system;
- quiz engine;
- speech recognition;
- pronunciation scoring;
- school integration;
- teacher portal;
- mobile native application;
- Kubernetes;
- microservices.

The goal is to get the core homework workflow excellent first.

---

# 33. V1 Definition of Done

V1 is successful when the following scenario works reliably:

1. Start the application on a MacBook Pro using Docker.

2. Open the application from the MacBook browser.

3. Paste French homework text.

4. Receive:
   - preserved French;
   - natural English translation;
   - simple explanation of what the teacher wants.

5. Click/tap an individual French word and hear Canadian French pronunciation.

6. Click/tap the sentence speaker and hear the complete sentence.

7. Upload an actual French Immersion homework screenshot/photo.

8. See the original uploaded image.

9. Receive the same structured French/English/explanation result.

10. Open the application from an iPad or another device connected to the same home Wi-Fi.

11. Perform the same workflow successfully.

12. Gemini is the initial AI provider but application code is clearly structured so another LLM provider can be added without rewriting the application.

---

# 34. Instructions to Codex

Before writing implementation code:

1. Read this entire specification.
2. Inspect the repository if one already exists.
3. Identify ambiguities or architectural risks.
4. Propose the concrete V1 architecture.
5. Propose the internal `HomeworkAnalysis` TypeScript/Zod schema.
6. Propose the `LLMProvider` interface.
7. Propose the project directory structure.
8. Propose an incremental implementation plan.
9. Identify which decisions are required before implementation versus which can safely be deferred.
10. Do NOT implement the entire application immediately.

Prefer straightforward, maintainable code over unnecessary abstractions.

After presenting the plan, wait for approval before beginning Phase 0/Phase 1 implementation.