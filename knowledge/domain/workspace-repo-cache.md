---
version: 0.1.0-draft
name: workspace-repo-cache
summary: Daemon maintains a per-host repo cache so multiple tasks on the same workspace share a warm clone; new tasks create git worktrees off the cache instead of re-cloning.
category: domain
tags: [git, cache, worktree, daemon, performance]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: server/internal/daemon/repocache/cache.go
imported_at: 2026-04-18T00:00:00Z
---

The daemon caches each workspace's configured repo once on the host:

```
~/myapp_workspaces/.repos/
  <repo-hash>/           # bare clone or mirrored repo
    objects/
    refs/
    ...
```

Per-task workdirs are created as git worktrees off this cache, not fresh clones. First task on a new repo does the big clone; subsequent tasks get a fast `git worktree add` (seconds vs minutes for a large repo).

## Why

Coding-agent tasks often touch the same repo repeatedly — retries, different issues on the same codebase, parallel tasks by different agents. Re-cloning every time wastes disk, bandwidth, and time. Shared cache + worktrees makes N tasks cost roughly (1 clone + N worktrees) instead of N clones.

Caveats for the cache implementation:
- **Refresh logic** needs to fetch new origin refs before creating a worktree, or tasks see stale commits.
- **GC** must avoid deleting the base repo while worktrees still reference it — check for active worktrees before pruning.
- **Concurrency** — two tasks racing to clone the same repo for the first time must coordinate (a per-repo lock is the simplest fix).

## Evidence

- `server/internal/daemon/repocache/cache.go` — full implementation.
- `server/internal/daemon/daemon.go:60-68` — `repoCache: repocache.New(cacheRoot, logger)`.
