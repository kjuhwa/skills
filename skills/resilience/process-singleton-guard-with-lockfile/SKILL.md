---
name: process-singleton-guard-with-lockfile
description: Prevent multiple daemon instances using exclusive lockfile creation and PID validation
category: resilience
version: 1.0.0
version_origin: extracted
confidence: high
tags: [evolver, resilience, singleton, daemon, lockfile]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - index.js
imported_at: 2026-04-18T00:00:00Z
---

# Singleton daemon guard via exclusive lockfile

Acquire a singleton lock by writing the current PID to a file with exclusive-create (`{ flag: 'wx' }`). If the file exists, read the PID and probe liveness with `process.kill(pid, 0)`. Dead PID → stale lock, overwrite. Live PID → abort.

## Mechanism

```js
function acquireLock(path) {
  try {
    fs.writeFileSync(path, String(process.pid), { flag: 'wx' });
    return true;
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const pid = parseInt(fs.readFileSync(path, 'utf8'), 10);
    try { process.kill(pid, 0); return false; } // alive → abort
    catch { fs.writeFileSync(path, String(process.pid)); return true; } // stale → take
  }
}
process.on('exit', () => fs.unlinkSync(path));
```

## When to reuse

Background workers, evolution loops, schedulers, anything where parallel invocation would corrupt shared state.
