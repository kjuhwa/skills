---
version: 0.1.0-draft
name: autopilots-and-triggers-model
summary: Autopilots are scheduled automations that dispatch agent tasks (create an issue or run an agent directly); triggers are the scheduling layer (cron now, webhook/api future).
category: domain
tags: [autopilot, scheduling, triggers, cron, agents]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLI_AND_DAEMON.md
imported_at: 2026-04-18T00:00:00Z
---

Autopilot domain model:

- **Autopilot** — named automation with a title, description (used as the prompt), an agent, and a mode.
- **Mode**:
  - `create_issue` — each run creates a new issue assigned to the agent. This is the only mode exposed by the CLI today because issue-centric workflows have a clear workspace context for the run.
  - `run_only` — the server data model defines it, but the daemon task path doesn't yet resolve a workspace for a run without an issue, so it's not surfaced in the CLI.
- **Trigger** — scheduling record attached to an autopilot. `kind` can be `schedule` (cron), `webhook`, or `api`. CLI currently exposes only `schedule` because no server endpoint fires the other two yet.
- **Run** — one execution of an autopilot. `multica autopilot trigger <id>` forces a manual run, `multica autopilot runs <id>` lists history.

## Why

Separating autopilot (what to do) from trigger (when) lets one autopilot have multiple schedules — e.g. run at 9am weekdays AND on webhook. Separating run from issue means you can audit all firings of an autopilot, including manual triggers, in one place.

Gate CLI exposure on server-side readiness: don't let users configure `run_only` or webhook triggers until the execution path supports them, even if the schema does.

## Evidence

- `CLI_AND_DAEMON.md` "Autopilot Commands" section.
- `server/migrations/042_autopilot.up.sql` — data model.
- `server/service/autopilot.go` — execution wiring.
