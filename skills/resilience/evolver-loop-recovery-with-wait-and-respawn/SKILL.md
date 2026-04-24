---
name: evolver-loop-recovery-with-wait-and-respawn
description: Detect dead evolution loop and respawn with configurable wait interval
category: resilience
version: 1.0.0
version_origin: extracted
confidence: high
tags: [evolver, resilience, supervisor, respawn]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - scripts/recover_loop.js
imported_at: 2026-04-18T00:00:00Z
---

# Loop-recovery supervisor

Lightweight external supervisor: probe a background loop's liveness (PID file or `process.kill(pid, 0)`), wait a configurable interval, then respawn the entry point if dead.

## Mechanism

```js
const WAIT = envInt('EVOLVER_RECOVER_WAIT_MS', 10_000);

async function supervise(entryPoint) {
  while (true) {
    if (!alive(readPid())) {
      await sleep(WAIT);
      spawn('node', [entryPoint], { detached: true, stdio: 'ignore' }).unref();
    }
    await sleep(30_000);
  }
}
```

Locate the entry point dynamically (searching known installation paths) so the supervisor works across node_modules layouts.

## When to reuse

As a cron job, systemd unit, or in-repo watchdog for anything long-running that must auto-resurrect without a full service manager.
