---
version: 0.1.0-draft
name: session-immutability-with-transition-audit
summary: Treat AI-assistant sessions as immutable — state changes create new linked sessions with `parent_session_id` + a typed `transition_reason` enum, not in-place mutation, so every transition is auditable.
category: pitfall
confidence: high
tags: [sessions, immutability, state-machine, audit, ai-agent]
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
---

# Immutable Sessions With Transition Triggers

## Fact / Decision

When you persist AI-assistant sessions to a DB (`session_id`, resume capability, one active per conversation), **do not** mutate fields on an existing row to express transitions. Instead:

1. Mark sessions immutable once created (`is_active` flips only via deactivation; most other columns never change).
2. For any state transition — user `/reset`, plan→execute phase change, worktree removal, conversation closed, isolation changed — **create a new session** that links to the previous via `parent_session_id`, and record a `transition_reason` from a typed enum.
3. Encode the transition enum as a union + a `Record<Trigger, Behavior>` matrix so adding a new trigger requires categorizing it (compile-time exhaustiveness via `Record<Union, ...>`).

Archon's `TransitionTrigger` enum:

```ts
type TransitionTrigger =
  | 'first-message'         // No existing session
  | 'plan-to-execute'       // Plan phase completed, starting execution
  | 'isolation-changed'     // Working directory/worktree changed
  | 'reset-requested'       // User /reset
  | 'worktree-removed'      // Worktree manually removed
  | 'conversation-closed';  // Platform conversation closed
```

And the behavior matrix:

```ts
const TRIGGER_BEHAVIOR: Record<TransitionTrigger, 'creates' | 'deactivates' | 'none'> = {
  'first-message': 'none',         // No session to deactivate
  'plan-to-execute': 'creates',    // Deactivate AND immediately create new
  'isolation-changed': 'deactivates',
  'reset-requested': 'deactivates',
  'worktree-removed': 'deactivates',
  'conversation-closed': 'deactivates',
};
```

The result: every session row is a self-contained historical record. Debugging a user-reported issue walks backwards through `parent_session_id` and reads a human-readable reason at each step. This is **far** cleaner than trying to reason about "which fields of this row were mutated when."

## Why

AI-assistant workflows have many state transitions. Mutation-style persistence hides them — by the time you debug a user issue, the state machine has erased its history. Immutability + typed triggers gives:

- **Replay:** given an old `session_id`, you can reconstruct what happened by walking children.
- **Audit:** a user asking "why did my session reset?" gets the literal reason ("worktree-removed" vs "reset-requested") from the row.
- **Safety:** SQL upsert / `UPDATE` without WHERE-row-exists check cannot corrupt history when no field ever mutates.
- **Exhaustiveness:** the `Record<Union, ...>` matrix ensures every trigger gets categorized at compile time.

## Counter / Caveats

- Storage cost grows O(transitions). For chat workloads that's usually fine (a few transitions per conversation). For high-frequency state systems, consider a separate transitions table to keep sessions thin.
- The "only plan→execute creates new session immediately" distinction (vs "other triggers deactivate, next message creates new") is a product decision — it preserves the phase split while avoiding ghost empty sessions for the more common triggers. Pick what fits your UX.
- If you allow session *editing* (e.g. renaming), that's a separate concern — don't let editable metadata live in the immutable session row. Archon keeps titles / metadata on the conversation row, not the session.
- Don't conflate "immutable" with "append-only." Deactivation (`is_active: false`) is still an update; the load-bearing immutability is on content fields.

## Evidence

- `packages/core/src/state/session-transitions.ts:1-80`: full typed trigger union + `TRIGGER_BEHAVIOR` matrix + helper functions (`shouldCreateNewSession`, `shouldDeactivateSession`, `detectPlanToExecuteTransition`).
- Design comment at `session-transitions.ts:23-26`: "This Record type ensures compile-time exhaustiveness — adding a new trigger without categorizing it will cause a TypeScript error."
- Root `CLAUDE.md` lines 403-406: "Sessions are immutable — transitions create new linked sessions. Each transition has explicit `TransitionTrigger` reason. Audit trail: `parent_session_id` links to previous session, `transition_reason` records why. Only plan→execute creates new session immediately; other triggers deactivate current session."
- DB layer: `packages/core/src/db/sessions.ts`, SQLite DDL: `packages/core/src/db/adapters/sqlite.ts`.
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
