---
version: 0.1.0-draft
name: http-health-check-binary-takeover
summary: Bind the daemon's health port early (before resolving auth or syncing state) to detect another instance already running and prevent two daemons from claiming the same tasks.
category: devops
tags: [daemon, health-check, singleton, port-binding, lifecycle]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: server/internal/daemon/daemon.go
imported_at: 2026-04-18T00:00:00Z
---

A long-lived local daemon (task poller, background worker, anything with shared state) should treat "am I the only instance?" as a top-of-`main` check, not a bottom check. Concrete technique: bind the health-check port early.

```go
func (d *Daemon) Run(ctx context.Context) error {
    healthLn, err := d.listenHealth()  // binds port; fails fast if in use
    if err != nil { return err }
    // ... now safe to resolve auth, register runtimes, start loops ...
    go d.serveHealth(ctx, healthLn, time.Now())
    return d.pollLoop(ctx)
}
```

## Why

Port binding is atomic (OS-level `EADDRINUSE`) so it doesn't race with a PID-file check. If another daemon is already running, the new one fails fast with a clear error — before it tries to authenticate, register runtimes, or (worst case) claim tasks the first daemon is working on. PID files alone are unreliable: stale PID files after SIGKILL lead to false "already running" errors.

Use a deterministic per-profile port derivation (`defaultHealthPort + 1 + hash(profile) % 1000`) so profiles don't collide.

## Evidence

- `server/internal/daemon/daemon.go:92-99` — early health-port bind with explanatory comment.
- `CONTRIBUTING.md:497` — per-profile health port formula.
