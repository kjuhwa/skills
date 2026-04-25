---
name: bubblewrap-namespace-sandbox-config
description: Build a bwrap invocation with a JSON-driven mount config (RO binds, RW binds, disabled defaults). Validates paths, blocks forbidden mounts, and enforces that RW mounts stay under $HOME. Merges user config over the default arg list.
category: linux-sandbox
version: 1.0.0
tags: [bwrap, bubblewrap, sandbox, linux, namespace, mount, json-config]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

# Bubblewrap Namespace Sandbox Config

## When to use

Use this pattern when:
- You are wrapping a subprocess in a `bwrap` Linux namespace sandbox.
- You want users to customize mount points via a JSON config file without re-building or patching the launcher.
- You need to prevent unsafe configurations (e.g., users disabling `/usr` or `/etc`, or mounting paths outside their home directory as read-write).
- You want a default arg list that provides a minimal, secure root and then merge user additions on top.

## Pattern

### Default bwrap args: tmpfs-based minimal root

The default invocation builds a minimal root from the host:

```
tmpfs on /
/usr    RO bind
/etc    RO bind
/run    RO bind
/dev    dev bind
/proc   proc
$HOME   RO bind (only project workdir is RW)
project_workdir  RW bind
```

### JSON config overlay

A config file (`~/.config/AppName/app_linux_config.json`) can specify:
```json
{
  "preferences": {
    "sandboxBwrapMounts": {
      "additionalROBinds": ["/extra/data"],
      "additionalBinds": ["/home/user/writable-project"],
      "disabledDefaultBinds": ["/home/user"]
    }
  }
}
```

The `mergeBwrapArgs` function scans the default arg list, skips any `--ro-bind`/`--bind`/`--symlink` triplet whose destination path is in `disabledDefaultBinds`, then appends the additional binds.

### Path validation rules
- All paths must be absolute.
- Cannot mount `/`, `/proc`, `/dev`, `/sys`.
- `additionalBinds` (RW) must be under `$HOME`.
- `disabledDefaultBinds` cannot disable critical mounts (`/`, `/dev`, `/proc`).

## Minimal example

```javascript
const path = require('path');
const fs = require('fs');
const os = require('os');

const FORBIDDEN_MOUNT_PATHS = new Set(['/', '/proc', '/dev', '/sys']);
const CRITICAL_MOUNTS = new Set(['/', '/dev', '/proc']);

function validateMountPath(mountPath, opts = {}) {
    if (!mountPath || !path.isAbsolute(mountPath)) {
        return { valid: false, reason: 'Path must be absolute' };
    }
    const normalized = path.resolve(mountPath);
    let resolved = normalized;
    try { resolved = fs.realpathSync(normalized); } catch (_) {}

    for (const p of [normalized, resolved]) {
        if (FORBIDDEN_MOUNT_PATHS.has(p)) {
            return { valid: false, reason: `Path is forbidden: ${p}` };
        }
        for (const forbidden of FORBIDDEN_MOUNT_PATHS) {
            if (forbidden !== '/' && p.startsWith(forbidden + '/')) {
                return { valid: false, reason: `Path is under forbidden path: ${forbidden}` };
            }
        }
    }

    if (opts.readWrite) {
        const home = os.homedir();
        const check = resolved !== normalized ? resolved : normalized;
        if (check !== home && !check.startsWith(home + '/')) {
            return { valid: false, reason: 'Read-write mounts must be under $HOME' };
        }
    }

    return { valid: true };
}

function loadBwrapMountsConfig(configPath, warnFn = console.warn) {
    const empty = { additionalROBinds: [], additionalBinds: [], disabledDefaultBinds: [] };
    if (!configPath) return empty;

    let raw;
    try {
        raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (_) {
        return empty;
    }

    const mounts = raw?.preferences?.sandboxBwrapMounts;
    if (!mounts || typeof mounts !== 'object') return empty;

    function filterPaths(arr, readWrite) {
        if (!Array.isArray(arr)) return [];
        return arr.filter(p => {
            if (typeof p !== 'string') return false;
            const result = validateMountPath(p, { readWrite });
            if (!result.valid) warnFn(`Rejected mount path "${p}": ${result.reason}`);
            return result.valid;
        });
    }

    return {
        additionalROBinds: filterPaths(mounts.additionalROBinds, false),
        additionalBinds:   filterPaths(mounts.additionalBinds, true),
        disabledDefaultBinds: (Array.isArray(mounts.disabledDefaultBinds)
            ? mounts.disabledDefaultBinds
                .filter(p => {
                    if (typeof p !== 'string' || !path.isAbsolute(p)) return false;
                    const norm = path.resolve(p);
                    if (CRITICAL_MOUNTS.has(norm)) {
                        warnFn(`Cannot disable critical mount: ${norm}`);
                        return false;
                    }
                    return true;
                })
                .map(p => path.resolve(p))
            : []),
    };
}

// Merge user config over default bwrap arg list
function mergeBwrapArgs(defaultArgs, config) {
    const result = [];
    const disabled = new Set(config.disabledDefaultBinds.filter(p => !CRITICAL_MOUNTS.has(p)));

    const TWO_ARG_FLAGS = new Set(['--tmpfs','--dev','--proc','--dir','--remount-ro','--chdir','--unsetenv','--size','--perms','--file']);
    const THREE_ARG_FLAGS = new Set(['--ro-bind','--bind','--symlink','--ro-bind-try','--bind-try','--dev-bind','--dev-bind-try','--chmod','--setenv']);

    let i = 0;
    while (i < defaultArgs.length) {
        const flag = defaultArgs[i];
        if (THREE_ARG_FLAGS.has(flag) && i + 2 < defaultArgs.length) {
            const dest = defaultArgs[i + 2];
            if (disabled.has(dest)) { i += 3; continue; }
            result.push(defaultArgs[i], defaultArgs[i + 1], defaultArgs[i + 2]);
            i += 3;
        } else if (TWO_ARG_FLAGS.has(flag) && i + 1 < defaultArgs.length) {
            const dest = defaultArgs[i + 1];
            if (disabled.has(dest)) { i += 2; continue; }
            result.push(defaultArgs[i], defaultArgs[i + 1]);
            i += 2;
        } else {
            result.push(defaultArgs[i]);
            i++;
        }
    }

    for (const p of config.additionalROBinds) result.push('--ro-bind', p, p);
    for (const p of config.additionalBinds)   result.push('--bind', p, p);

    return result;
}

// Example: build and spawn a sandboxed process
function spawnSandboxed(command, args, workDir, configPath) {
    const defaultBwrapArgs = [
        '--tmpfs', '/',
        '--ro-bind', '/usr', '/usr',
        '--ro-bind', '/etc', '/etc',
        '--ro-bind', '/run', '/run',
        '--dev-bind', '/dev', '/dev',
        '--proc', '/proc',
        '--ro-bind', os.homedir(), os.homedir(),
        '--bind', workDir, workDir,
        '--chdir', workDir,
        '--unshare-pid',
    ];

    const config = loadBwrapMountsConfig(configPath);
    const bwrapArgs = mergeBwrapArgs(defaultBwrapArgs, config);

    const { spawn } = require('child_process');
    return spawn('bwrap', [...bwrapArgs, '--', command, ...args]);
}
```

## Why this works

### tmpfs root prevents host filesystem leakage

Starting with `--tmpfs /` creates an empty root. Everything visible inside the sandbox must be explicitly bound. This is far safer than an allowlist approach (where you start with the full host and try to hide things) because forgotten paths are invisible rather than accidentally exposed.

### Destination-based disable matching

When iterating the default arg list, the "destination" of a `--ro-bind src dst` triplet is `dst` (index +2). The disable set contains absolute normalized paths. Matching on the destination (not source) correctly handles cases where the same host path is bound to a different sandbox path.

### Symlink resolution in `validateMountPath`

A user could specify a symlink to a forbidden path (e.g., `/home/user/root-link -> /`) to bypass path checks. Calling `fs.realpathSync` on the specified path and checking the resolved form as well as the literal form closes this escape hatch. The try/catch handles the case where the path does not yet exist (it will be validated at mount time by bwrap itself).

### RW bound to `$HOME` only

Allowing read-write mounts anywhere on the system would let the sandboxed process modify arbitrary files. Restricting RW mounts to paths under `$HOME` limits blast radius to the user's own data.

## Pitfalls

- **Disabling `/usr` or `/etc` breaks the sandbox** — basic tools like `sh`, `ls`, and dynamic linker live in `/usr`. Any process that needs to exec will fail. Guard against this in `disabledDefaultBinds` validation and warn loudly.
- **`bwrap --unshare-pid` requires a `--proc` mount** — if you skip `--proc`, processes inside the sandbox cannot fork. Always include `--proc /proc` with `--unshare-pid`.
- **Config changes require daemon restart** — if the daemon caches bwrap args at startup, a config change requires restarting the daemon. Document this clearly.
- **`realpathSync` has TOCTOU** — the symlink target can change between validation and bwrap invocation. This is a known limitation. bwrap itself is the real security boundary; `validateMountPath` catches honest mistakes, not adversarial symlink races.
- **`--size` flag for `--tmpfs`** — without `--size`, tmpfs defaults to half of RAM. For long-running or multiple concurrent sandboxes, set an explicit size limit.

## Source reference

`scripts/cowork-vm-service.js` — functions `validateMountPath`, `loadBwrapMountsConfig`, `mergeBwrapArgs`; `docs/CONFIGURATION.md` for config file format
