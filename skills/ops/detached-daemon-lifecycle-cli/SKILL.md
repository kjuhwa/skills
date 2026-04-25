---
name: detached-daemon-lifecycle-cli
description: Give a node script a drop-in start/stop/restart/status/log/check CLI by discovering processes via ps-args pattern match rather than trusting a PID file, persisting a best-effort PID, escalating SIGTERM → wait → SIGKILL on stop, and defining "healthy" as "process exists AND log has been written within MAX_SILENCE_MS."
category: ops
version: 1.0.0
version_origin: extracted
tags: [daemon, lifecycle, pid-file, sigterm, stagnation-detection, cli]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 4c51382092f9cb125d3ec55475861ead8d1463a6
source_project: evolver
source_paths:
  - src/ops/lifecycle.js
imported_at: 2026-04-18T03:00:00Z
---

# Detached Daemon Lifecycle CLI

A small pattern for "I want `node foo.js --loop` to behave like a well-behaved system daemon without pulling in pm2, systemd, or launchd."

## CLI surface

```
node lifecycle.js start     # spawn detached, write PID file, exit
node lifecycle.js stop      # SIGTERM all matching procs, wait up to 5s, SIGKILL stragglers
node lifecycle.js restart   # stop + 2s delay + start
node lifecycle.js status    # list running PIDs with cmdlines; {running: false} otherwise
node lifecycle.js log       # tail -n 20 of the shared log file
node lifecycle.js check     # checkHealth(); if unhealthy, auto-restart
```

Exactly six verbs. Anything more is feature creep.

## Process discovery: don't trust the PID file alone

A stale PID file is the number-one footgun. Always cross-check against the live process table:

```js
function getRunningPids() {
  const out = execSync('ps -e -o pid,args', { encoding: 'utf8' });
  return out.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('PID'))
    .map(l => { const [pid, ...rest] = l.split(/\s+/); return [parseInt(pid, 10), rest.join(' ')]; })
    .filter(([pid, cmd]) =>
      pid !== process.pid &&
      cmd.includes('node') && cmd.includes('index.js') && cmd.includes('--loop')
    )
    .map(([pid]) => pid)
    .filter(isPidRunning);
}
```

The PID file is a *hint for stop*, not the source of truth. Discovery by cmdline-signature survives PID reuse, accidental file deletion, and crashes during write.

## Spawn as truly detached

```js
const out = fs.openSync(LOG_FILE, 'a');
const err = fs.openSync(LOG_FILE, 'a');
const child = spawn('node', [script, '--loop'], {
  detached: true,
  stdio: ['ignore', out, err],
  cwd: WORKSPACE_ROOT,
  env,
});
child.unref();
fs.writeFileSync(PID_FILE, String(child.pid));
```

Three things to get right: `detached: true`, `child.unref()`, and redirecting stdout/stderr to file descriptors — not streams the parent owns.

## Stop: escalate, don't hard-kill

```js
pids.forEach(p => { try { process.kill(p, 'SIGTERM'); } catch {} });
for (let i = 0; i < 10 && getRunningPids().length; i++) execSync('sleep 0.5');
getRunningPids().forEach(p => { try { process.kill(p, 'SIGKILL'); } catch {} });
```

Five seconds of grace is almost always enough for a well-behaved Node loop to flush and exit. Immediate SIGKILL truncates log buffers and leaves half-written state files.

## Health: liveness AND progress

```js
function checkHealth() {
  if (!getRunningPids().length) return { healthy: false, reason: 'not_running' };
  const silenceMs = Date.now() - fs.statSync(LOG_FILE).mtimeMs;
  if (silenceMs > MAX_SILENCE_MS) {
    return { healthy: false, reason: 'stagnation', silenceMinutes: Math.round(silenceMs / 60000) };
  }
  return { healthy: true };
}
```

"Alive but silent" is the single most common failure mode of a long-running loop. Define healthy as *both* PID exists *and* log mtime is recent. Pair `check` with a cron/systemd timer that runs every few minutes and auto-restarts on stagnation.

## PID locations, when to clean

- `${WORKSPACE_ROOT}/memory/evolver_loop.pid` — daemon PID (deleted by `stop`).
- `${REPO_ROOT}/evolver.pid` — "cross-process lock" PID some evolver loops create themselves (also deleted by `stop`).

Stopping must delete both, or a future `start` will report "already running" off a zombie file.

## Portability caveat

The `ps -e -o pid,args` trick is POSIX-only. For Windows, swap to `tasklist /v /fo csv` or `wmic process` and match on the command line. Keep the predicate (`node`, `index.js`, `--loop`) identical across platforms.
