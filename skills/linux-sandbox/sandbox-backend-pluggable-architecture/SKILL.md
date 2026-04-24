---
name: sandbox-backend-pluggable-architecture
description: Three-backend dispatcher (Host/Bwrap/KVM) with auto-detection priority and env override. Abstract base class defines the interface; concrete implementations handle isolation. Used to run untrusted subprocess workloads on Linux with progressive isolation.
category: linux-sandbox
version: 1.0.0
tags: [sandbox, bubblewrap, bwrap, kvm, linux, isolation, pluggable, daemon]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

# Sandbox Backend Pluggable Architecture

## When to use

Use this pattern when:
- You need to run user-submitted or untrusted code with varying isolation levels depending on available system capabilities.
- You want progressive isolation: strongest available sandbox by default, graceful fallback when tools are missing.
- You want a single interface that callers use regardless of which backend is active.
- You need runtime override for testing or power users (`SANDBOX_BACKEND=host` to disable isolation).

## Pattern

### Backend priority order (auto-detection)

```
1. bwrap  — if bwrap binary exists AND a test invocation succeeds
2. kvm    — if /dev/kvm accessible + qemu + vsock all present
3. host   — fallback (no isolation, always available)
```

### Interface (abstract base)

All backends implement the same async interface. The dispatcher creates the right backend instance and the caller never sees which one is running.

```
BackendBase
  ├── init(config)
  ├── startVM(params) → void
  ├── stopVM()
  ├── isRunning() → { running: bool }
  ├── isGuestConnected() → { connected: bool }
  ├── spawn(params) → { id }
  ├── kill(params)
  ├── writeStdin(params)
  ├── isProcessRunning(params) → { running: bool }
  ├── mountPath(params) → { path }
  ├── readFile(params) → { content }
  ├── installSdk(params)
  └── addApprovedOauthToken(params)
```

## Minimal example

```javascript
// backends/base.js
class BackendBase {
    constructor(emitEvent) {
        this.emitEvent = emitEvent;  // callback to push events to subscribers
    }
    async init(config)              { throw new Error('Not implemented: init'); }
    async startVM(params)           { throw new Error('Not implemented: startVM'); }
    async stopVM()                  { throw new Error('Not implemented: stopVM'); }
    isRunning()                     { throw new Error('Not implemented: isRunning'); }
    isGuestConnected()              { throw new Error('Not implemented: isGuestConnected'); }
    async spawn(params)             { throw new Error('Not implemented: spawn'); }
    async kill(params)              { throw new Error('Not implemented: kill'); }
    async writeStdin(params)        { throw new Error('Not implemented: writeStdin'); }
    isProcessRunning(params)        { throw new Error('Not implemented: isProcessRunning'); }
    async mountPath(params)         { throw new Error('Not implemented: mountPath'); }
    async readFile(params)          { throw new Error('Not implemented: readFile'); }
    async installSdk(params)        { throw new Error('Not implemented: installSdk'); }
    async addApprovedOauthToken(p)  { throw new Error('Not implemented: addApprovedOauthToken'); }
}

// backends/host.js
class HostBackend extends BackendBase {
    constructor(emitEvent) {
        super(emitEvent);
        this.running = false;
        this.processes = new Map();
    }
    isRunning() { return { running: this.running }; }
    isGuestConnected() { return { connected: this.running }; }
    async startVM(params) { this.running = true; }
    async stopVM() {
        this.running = false;
        for (const [, proc] of this.processes) {
            try { proc.kill(); } catch (_) {}
        }
        this.processes.clear();
    }
    async spawn(params) {
        const { spawn } = require('child_process');
        const id = require('crypto').randomUUID();
        const child = spawn(params.command, params.args || [], {
            cwd: params.cwd || process.env.HOME,
            env: { ...process.env, ...params.env },
        });
        this.processes.set(id, child);
        child.stdout.on('data', d => this.emitEvent({ type: 'stdout', id, data: d.toString() }));
        child.stderr.on('data', d => this.emitEvent({ type: 'stderr', id, data: d.toString() }));
        child.on('exit', code => {
            this.processes.delete(id);
            this.emitEvent({ type: 'exit', id, code });
        });
        return { id };
    }
    // ... other methods
}

// dispatcher.js — auto-detect the best available backend
const { execSync } = require('child_process');
const fs = require('fs');

function detectBackend(override) {
    if (override) {
        switch (override.toLowerCase()) {
            case 'bwrap': return 'bwrap';
            case 'kvm':   return 'kvm';
            case 'host':  return 'host';
        }
    }
    // Try bwrap
    try {
        execSync('which bwrap', { stdio: 'ignore' });
        execSync('bwrap --ro-bind / / true', { stdio: 'ignore' });
        return 'bwrap';
    } catch (_) {}
    // Try KVM
    if (fs.existsSync('/dev/kvm')) {
        try {
            fs.accessSync('/dev/kvm', fs.constants.R_OK | fs.constants.W_OK);
            execSync('which qemu-system-x86_64', { stdio: 'ignore' });
            if (fs.existsSync('/dev/vhost-vsock')) return 'kvm';
        } catch (_) {}
    }
    return 'host';
}

function createBackend(emitEvent) {
    const override = process.env.SANDBOX_BACKEND || null;
    const name = detectBackend(override);
    switch (name) {
        case 'bwrap': return new BwrapBackend(emitEvent);
        case 'kvm':   return new KvmBackend(emitEvent);
        default:      return new HostBackend(emitEvent);
    }
}
```

## Why this works

### Auto-detection with functional test for bwrap

Checking `which bwrap` alone is insufficient — on some systems bwrap is installed but the kernel user namespace feature is disabled. Running `bwrap --ro-bind / / true` as a smoke test confirms that bwrap actually works. The `{ stdio: 'ignore' }` option prevents output pollution. If the test throws, fall through to the next backend.

### `emitEvent` callback decouples event routing from backend logic

Each backend receives an `emitEvent` function at construction time. This inversion of control means:
- The backend does not need to know how events are delivered (WebSocket, IPC, file, etc.).
- Tests can pass a mock `emitEvent` and assert on its calls.
- Multiple subscribers can be supported by wrapping `emitEvent` in the dispatcher.

### Env override for testing and power users

`SANDBOX_BACKEND=host` lets developers test without bwrap and lets power users opt out of sandboxing for compatibility. The override is checked first in `detectBackend`, before any capability detection, so it is always honored.

### Consistent interface regardless of backend

All three backends implement the same interface. The caller (typically a JSON-RPC dispatcher) does `await backend.spawn(params)` without knowing or caring which backend is active. This is the classic Strategy pattern.

## Pitfalls

- **`bwrap --ro-bind / / true` as a test is a process spawn** — this adds latency to daemon startup. Run it once at startup, cache the result; do not run it per-request.
- **KVM access requires group membership** — `/dev/kvm` may be readable only by the `kvm` group. `fs.accessSync` checks the effective uid/gid. If the user is not in the `kvm` group, fall through to bwrap.
- **Backend state is stateful** — `isRunning()` and `isGuestConnected()` return state set by `startVM`/`stopVM`. If the backend process crashes externally, this state can become stale. Consider a health-check heartbeat for production use.
- **`processes` Map grows without bound if exit events are missed** — always remove entries in the `exit` handler. If the process is killed externally (SIGKILL), the exit event may not fire. Consider a periodic cleanup pass for zombied entries.
- **Do not use `throw` from interface base class on production** — callers expect a promise rejection, not a synchronous throw. Wrap in `return Promise.reject(new Error(...))` for consistent async error handling.

## Source reference

`scripts/cowork-vm-service.js` — `BackendBase`, `LocalBackend`, `BwrapBackend`, and `detectBackend` function
