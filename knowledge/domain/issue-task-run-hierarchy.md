---
version: 0.1.0-draft
name: issue-task-run-hierarchy
summary: Issue → Tasks (a.k.a. runs) → Messages. One issue can have many runs; each run streams messages during agent execution.
category: domain
tags: [issue-tracker, task, run, messages, agent-execution]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLI_AND_DAEMON.md
imported_at: 2026-04-18T00:00:00Z
---

Execution model for agent-assigned issues:

- **Issue** — the unit of work assigned to an agent. Has status (`backlog | todo | in_progress | in_review | done | blocked | cancelled`).
- **Run / Task** — one execution attempt of the issue by the agent. An issue can have many runs (retries, re-assignments, manual reruns).
- **Message** — per-run event: tool calls, thinking blocks, text output, errors. Each has a monotonic sequence number for efficient incremental polling (`--since <seq>`).

CLI exposes:
```
multica issue runs <issue-id>                            # list all runs
multica issue run-messages <task-id>                     # full message log
multica issue run-messages <task-id> --since 42          # poll for new messages
```

## Why

Separating issue from run is important because "how did we get here" matters as much as "where are we" for managed-agent workflows. A failed attempt, a retry, and the final run that closes the issue are all historically inspectable. Without the run layer the history collapses to "status = done" with no audit trail.

The `--since` monotonic sequence is what makes live UI polling cheap: the frontend polls every 1-2s during in-progress runs and only fetches the tail of the message log, not the whole thing.

## Evidence

- `CLI_AND_DAEMON.md` "Execution History" section.
- Migrations 020 (task_session), 026 (task_messages), 032 (task_usage) in `server/migrations/`.
