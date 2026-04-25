---
version: 0.1.0-draft
name: idempotent-migration-with-resume-checkpoint
description: "Idempotent DB migration with checkpoint resume: every step records progress so crash + restart picks up where it stopped"
category: db
tags:
  - migration
  - idempotency
  - checkpoint
  - resume
  - crash-safe

composes:
  - kind: skill
    ref: backend/migration-processor-pipeline
    version: "*"
    role: migration-shape-baseline
  - kind: skill
    ref: workflow/idempotency-data-simulation
    version: "*"
    role: per-step-idempotency-pattern
  - kind: knowledge
    ref: pitfall/idempotency-implementation-pitfall
    version: "*"
    role: counter-evidence

binding: loose

verify:
  - "every composes[].ref is installed in the hub"
  - "the technique requires checkpoint persistence to survive process crash, not just retry"
---

# Idempotent DB Migration with Resume Checkpoint

> A long-running schema/data migration that can crash and restart at any point and still complete correctly. Each step is idempotent (re-running has no effect after first run); a persistent checkpoint table records which steps completed.

## When to use

- Migration touches enough rows that one process restart is plausible during the run
- Restart-from-scratch would either be impossibly slow or partially destructive
- Multiple operators may participate (one starts, another resumes)

## When NOT to use

- Migration small enough to complete within a single transaction (use a regular transaction)
- Steps with non-idempotent side effects that can't be made idempotent (use a transactional outbox pattern instead)
- One-shot deployment where rollback is preferred over resume

## Phase sequence

```
[init: ensure checkpoint table exists]
       │
       ▼
[step 1] ──► [record step 1 done in checkpoint]
       │
       ▼
[step 2] ──► [record step 2 done]
       │       (process can crash anywhere here)
       ▼
[step 3] ──► [record step 3 done]
       │
       ▼
[done]
   ▲
on resume: read checkpoint, skip completed steps, run remaining
```

## Glue summary (net value added)

| Added element | Where |
|---|---|
| Checkpoint table is part of the migration's own schema, version-controlled with it | Init |
| Each step's "is this done?" check uses a stable predicate (e.g. column exists, row count == N), not just a flag | Per step |
| Idempotency at the step LEVEL must compose with idempotency at the SQL level (UPSERT, CREATE IF NOT EXISTS, etc.) | Step body |
| Crash recovery test is part of the migration's own test suite — kill -9 mid-run, verify resume completes correctly | Test policy |

## Known limitations

- Adds checkpoint table overhead even for small migrations
- Some side-effects (sending email, calling external APIs) are hard to make truly idempotent — needs separate outbox
- Long migrations holding row locks should also fragment to avoid lock contention; this technique addresses crash-safety, not lock-time

## Provenance

- Authored 2026-04-25, pilot in 10-technique batch
- Builds on saga's idempotency requirement (#5) but applied to long-running migrations
