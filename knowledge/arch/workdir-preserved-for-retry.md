---
version: 0.1.0-draft
name: workdir-preserved-for-retry
summary: Per-task agent workdirs are intentionally NOT deleted after task completion — they enable faster retries (cached repo state, warmed caches) and post-mortem inspection.
category: arch
tags: [daemon, workdir, retries, gc, agents]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: server/internal/daemon/daemon.go
imported_at: 2026-04-18T00:00:00Z
---

The daemon writes each task's working copy into a per-task directory under `~/myapp_workspaces/<workspace_id>/<task_short_id>/` and leaves it there after the task finishes. No cleanup on success or failure.

## Why

Two reasons, both load-bearing:
1. **Retry speed.** If the agent fails halfway and the user retries, the cached git clone, node_modules, and any build caches are already on disk. Cold-start retries would be needlessly slow.
2. **Post-mortem inspection.** Users open the workdir when an agent did something strange to figure out what actually happened. If you delete it, they can't.

Cleanup is left to a separate GC loop (`gcLoop`) that runs on a slow timer and deletes workdirs whose parent issue has been closed for some threshold. That keeps the "why is my laptop out of disk?" case solvable without breaking the retry story.

## Evidence

- `server/internal/daemon/daemon.go:943` — explicit `// NOTE: No cleanup — workdir is preserved for reuse by future tasks` comment.
- `server/internal/daemon/gc.go` — slow GC loop.
