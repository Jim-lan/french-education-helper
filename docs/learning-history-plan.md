# Learning history and monthly review

Owner requested October 25, 2026; approved by “proceed and finish it.” This extends
the original V1 scope; PROJECT_SPEC.md remains the original design record.

- Automatically retain accepted French-study notes, original images, explanations,
  checked answers and targeted-practice attempts in server-side SQLite. Reject
  unrelated material with a reason before storing it.
- Group shared household history by local calendar date, filter by month/date, and
  open a note to compare earlier attempts, marks and feedback or redo it. Marks are
  teacher requirements met / checked; ambiguous tasks have no numerical mark.
- Unlock a short spelling, meaning, sentence and similar-sound game after the
  original task passes. Generate its structured content once, grade locally on the
  server, preserve every attempt, and use browser audio throughout.
- Prepare one monthly summary quiz from each completed month containing learning
  records. A lightweight hourly in-app job catches up after Mac/Docker downtime;
  the monthly page can also prepare/retry reviews and preview the current month.
  Saved quizzes work without further provider calls; new work can produce a new
  version without destroying old quiz attempts.
- Persist the database in a Docker volume, keep it out of Git/build context, and
  document backup and household access. Default calendar zone: America/Toronto.
- Validate persistence, dates, relevance rejection, requirement marks, server-side
  quiz grading, retries/versioning and audio with deterministic tests, then build
  and verify the actual Docker UI at desktop/phone widths.

Accounts/cloud publishing, HEIC conversion, speech-recognition scoring and alternate
provider implementations remain later scope, as in the master specification.
