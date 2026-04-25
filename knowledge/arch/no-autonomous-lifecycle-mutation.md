---
version: 0.1.0-draft
name: no-autonomous-lifecycle-mutation
summary: A process that cannot reliably distinguish "actively running elsewhere" from "orphaned by a crash" must not autonomously mark work as failed/cancelled/abandoned based on a timer or staleness guess.
category: arch
confidence: high
tags: [architecture, lifecycle, cross-process, principle, concurrency]
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
---

# No Autonomous Lifecycle Mutation Across Process Boundaries

## Fact / Decision

In systems where work is initiated and tracked across process boundaries (CLI → DB; webhook → server → DB; cron → shared queue), a process cannot reliably distinguish two states:

1. **"Actively running elsewhere"** — another process is working on this row right now.
2. **"Orphaned by a crash"** — the originating process died without writing a terminal status.

Any timer-or-staleness-based heuristic to auto-mark non-terminal work as `failed` / `cancelled` / `abandoned` **will** sometimes destroy active work. Therefore:

- **Do not autonomously mutate non-terminal lifecycle state** that was started by a process you can't introspect.
- Surface the ambiguous state to the user with a one-click resolution ("This run appears stuck — mark as abandoned? Resume?").
- Keep this rule separate from heuristics for *recoverable* operations: retry backoff, subprocess timeouts that **you** started, hygiene cleanup of rows that are already in terminal status (MERGED, ABANDONED, DELETED). The rule is specifically about destructive mutation of **non-terminal** state owned by an unknowable other party.

## Why

A startup-time "clean up orphans older than N minutes" pass seems helpful. In practice it races against:

- Users who left the CLI open in a backgrounded terminal for hours.
- Long-running workflows that legitimately span days.
- Multi-process deployments where `archon serve` restarts while `archon workflow run` is still going.

When the cleanup wrongly marks these as failed, users see their work vanish with no indication why. Support burden spikes. The "orphan cleanup" feature is almost always the wrong abstraction; the right one is user-visible ambiguous-state handling.

## Counter / Caveats

- **Retry / timeout for work I started in-process** is fine — you can observe your own subprocesses.
- **Hygiene cleanup of terminal rows** is fine — a row that's `merged` or `cancelled` is safe to delete after N days.
- **Best-effort advisory display** ("This run was last updated 7 days ago") is fine — it's information, not mutation.
- If you have a heartbeat protocol where the owning process writes a liveness timestamp every N seconds, you can reliably detect crash-vs-alive. Absent that, default to no-op.

## Evidence

- Root `CLAUDE.md` lines 80-84 — the principle is codified word-for-word as "No Autonomous Lifecycle Mutation Across Process Boundaries" with issue reference and CLI orphan-cleanup precedent at `packages/cli/src/cli.ts:256-258`.
- Archon issue #1216 (referenced inline in CLAUDE.md) is the precedent case.
- The principle is cited repeatedly in the codebase's fail-fast error handling, which prefers "throw with a clear error" over "silent fallback" for exactly this class of ambiguity.
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
