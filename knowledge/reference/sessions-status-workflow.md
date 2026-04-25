---
version: 0.1.0-draft
name: sessions-status-workflow
summary: Sessions carry a dynamic status (default: Todo → In Progress → Needs Review → Done) stored per-workspace; customizable via statuses/ folder and used by UI + automations (SessionStatusChange event).
category: reference
tags: [sessions, status, workflow, dynamic]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/statuses
imported_at: 2026-04-18T00:00:00Z
---

# Session status workflow

### What it is
Every session has a status string — a user-defined label representing lifecycle state. Default set: `Todo`, `In Progress`, `Needs Review`, `Done`. Users can customize per workspace (rename, add, remove) via the statuses config file at `<workspace>/statuses/`.

### Where it lives
- In the session: `sessionStatus` field in `SessionHeader` (see `packages/shared/src/sessions/types.ts`).
- Workspace-level config: `<workspace>/statuses/config.json` (workflow order, colors, icons).
- Rendered in UI: inbox/archive split, status filter chips, status dropdown on each session card.

### Events
- `SessionStatusChange` fires on the automation bus with `{ sessionId, from, to }`.
- Example automation: "when status becomes `Done`, POST to a Slack webhook with the session summary".

### Archiving
Craft Agents uses status (not a boolean) to distinguish inbox vs archive:
- Inbox: sessions NOT in the terminal statuses (default `Done`).
- Archive: sessions in terminal status.
- Users can change what "terminal" means via config.

### Implementation hooks
- Status changes go through the same `SessionPersistenceQueue` + atomic header rename path; debounced 500ms.
- Header-only reads (`readSessionHeader`) mean the inbox list paints quickly without parsing message bodies.
- Flipping a large batch of sessions to `Done` is fast because each write is just the first line.

### Why dynamic not hardcoded
- Users run diverse workflows: support (Triaged/Responding/Awaiting Customer/Closed), research (Reading/Writing/Reviewed), personal todo (straightforward).
- The system doesn't need a full Jira — just a name + color + order per status.
- Moves rename / reordering changes out of code into config.

### Integration with Labels
Labels (multi-tag) and status (single-value state machine) are orthogonal. A session can have labels `[urgent, bug]` AND status `In Progress`. Automations can match on either.

### Reference
- `packages/shared/src/statuses/` — CRUD for the workspace status config.
- `packages/shared/src/sessions/types.ts#SessionHeader.sessionStatus`.
- `packages/shared/src/automations/handlers/` — how status changes wire to prompt/webhook actions.
