---
name: structured-pino-event-naming
description: Enforce `{domain}.{action}_{state}` event names with `_started`/`_completed`/`_failed` pairs so grepping and metric aggregation stay predictable.
category: observability
version: 1.0.0
version_origin: extracted
tags: [logging, pino, observability, event-naming, structured]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
---

# Structured Pino Event Naming Discipline

## When to use

- You use Pino (or any structured logger) in a multi-package monorepo where the second argument of `log.info(...)` is an event message and you grep/alert on it.
- You've felt the pain of inconsistent event names: `"session created"`, `"creating session"`, `"new session"` — all the same event, impossible to dashboard.
- You want a one-line convention that codifies the "start / end" pairing so incomplete events are visible.

## Steps

1. **Adopt one canonical format** and put it in `CLAUDE.md` / `CONTRIBUTING.md`:

   ```
   {domain}.{action}_{state}
   ```

   - `domain` = subsystem slug (snake- or dot-separated). Examples: `session`, `workflow`, `isolation`, `adapter.github`, `provider.registry`.
   - `action` = the verb in past tense or ing-less (`create`, `resolve`, `send_query`).
   - `state` = one of a fixed vocabulary: `_started`, `_completed`, `_failed`, `_validated`, `_rejected`, `_skipped`.

   Example: `session.create_started`, `workflow.step_failed`, `isolation.creation_failed`.

2. **Pair every `_started` with `_completed` or `_failed` in the same function.** Codify this as a code-review comment ("where's the completed/failed pair?"). This guarantees incomplete operations show up as `_started` with no terminal event — a dashboard can count `sum(started) - sum(completed) - sum(failed)` and alert when non-zero after a window.

3. **Attach structured fields, not interpolated strings.** Always `log.info({ conversationId, codebaseId }, 'session.create_started')`, never `log.info(\`Creating session for ${id}\`)`. This is the whole point of structured logging — keep the event name low-cardinality and put high-cardinality data in the object.

4. **Use a dedicated logger per module** via `createLogger('orchestrator')` — Pino's child logger with a `{ module }` binding. This lets you filter by module without parsing event names.

5. **Banned patterns.** Add to your style guide:
   - Generic event names: `processing`, `handling`, `got_event`. Rejected.
   - Event names with spaces: `"session created"`. Rejected.
   - Event names that embed IDs: `session_abc123_completed`. Rejected — IDs go in the object.
   - Logging exceptions as strings: `log.error('Error: ' + err.message)`. Always pass `{ err, errorType: err.constructor.name }`.

6. **Error-log template:**

   ```ts
   catch (e) {
     const err = e as Error;
     log.error({ err, errorType: err.constructor.name, conversationId }, 'session.create_failed');
     throw err;
   }
   ```

7. **Never log:** API keys, tokens, raw user-message content, PII. If you must include a token for debugging, slice it: `token.slice(0, 8) + '...'`.

## Counter / Caveats

- Don't try to retrofit this across a 100k-LOC codebase in one go. Pick a domain, grep its events, rename, ship, repeat.
- For very hot paths (e.g. per-chunk streaming), rely on `debug` level rather than inflating the event dictionary with per-chunk events. A hot path should emit `_started` + `_completed` around the whole stream, plus debug-level `chunk_emitted` inside.
- The fixed state vocabulary is deliberately small. Resist adding `_errored`, `_crashed`, `_retrying` — they weaken the tight pairing. `_failed` covers all terminal failure modes; use a `reason` field inside the log object for sub-classification.
- Some domains have non-lifecycle events (e.g. `adapter.incoming_webhook`). That's fine; just keep the `domain.action` format and document exceptions.

## Evidence

- `packages/paths/src/logger.ts`: `createLogger(module)` factory producing Pino child loggers with `{ module }` binding.
- Root `CLAUDE.md` lines 634-676: the "Logging" section documents the rule. Quote: "Event naming rules: Format: `{domain}.{action}_{state}` — e.g. `workflow.step_started`, `isolation.create_failed`. Avoid generic events like `processing` or `handling`. Always pair `_started` with `_completed` or `_failed`."
- Enforcement examples throughout the codebase: `sse_stream_closed`, `isolation_creation_failed`, `provider.registered`, `github.webhook_processing`, `web.adapter_ready`, `codex.binary_resolved`.
- Pino-pretty falls-back pattern at `packages/paths/src/logger.ts:63-83` ensures the logger itself never crashes the process on pretty-printer bugs.
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
