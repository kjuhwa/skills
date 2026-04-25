---
version: 0.1.0-draft
name: nested-claude-code-session-deadlock
summary: Spawning a Claude Code subprocess from inside a Claude Code session deadlocks silently because the Agent SDK leaks `process.env` into the child regardless of the `env` option, so `CLAUDECODE=1` and `CLAUDE_CODE_*` markers propagate.
category: pitfall
confidence: high
tags: [claude-code, subprocess, deadlock, env-leak, agent-sdk]
source_type: extracted-from-git
source_url: https://github.com/coleam00/Archon.git
source_ref: dev
source_commit: d89bc767d291f52687beea91c9fcf155459be0d9
source_project: Archon
imported_at: 2026-04-18T00:00:00Z
linked_skills: [strip-cwd-env-boot]
---

# Nested Claude Code Sessions Deadlock Silently

## Fact / Decision

When the Claude Code SDK spawns a subprocess, the child **inherits the parent's full `process.env`** regardless of the explicit `env` option passed to the SDK's `query({ env: ... })` call (confirmed in Archon's notes: coleam00/Archon#1097).

If the parent process is running inside a Claude Code terminal session, that parent's env contains `CLAUDECODE=1` plus a set of `CLAUDE_CODE_*` markers that Claude Code uses internally to detect "I'm already in a session." When the child inherits those markers, Claude Code's internal state machine becomes confused and the nested session **hangs silently** — no error, no crash, just an unresponsive subprocess.

The only reliable workaround is to **strip the markers from `process.env` of the parent before any Agent-SDK call**. The four keys to strip:

1. `CLAUDECODE`
2. Any `CLAUDE_CODE_*` key **except** auth-related ones (`CLAUDE_CODE_OAUTH_TOKEN`, `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`).

Archon additionally strips `NODE_OPTIONS` and `VSCODE_INSPECTOR_OPTIONS` which can crash Claude Code subprocesses (anthropics/claude-code#4619).

Emit a stderr warning when `CLAUDECODE=1` is detected, **before** you delete the marker (otherwise downstream code never sees the signal). Give the user a workaround and a suppression env var:

```
⚠ Detected CLAUDECODE=1 — running inside a Claude Code session.
   If workflows hang silently, this is a known class of issue.
   Workaround: run `archon serve` from a regular shell.
   Suppress: set ARCHON_SUPPRESS_NESTED_CLAUDE_WARNING=1
   Details: https://github.com/coleam00/Archon/issues/1067
```

## Why

The env-inheritance leak comes from Node.js's child-process default behavior: `spawn(cmd, args)` without an explicit `env` option inherits the parent env. The Agent SDK's `env` option filters through that default, but internal implementation paths (e.g. spawning helper processes for MCP, skills, hooks) may bypass the explicit option.

Rather than wait for the SDK to fix it, the fix in user code is to make the parent env clean before any call.

## Counter / Caveats

- The auth markers (`CLAUDE_CODE_OAUTH_TOKEN` etc.) **must be kept** — they're how the SDK authenticates. Curate the strip list carefully.
- If you run inside a Claude Code session *intentionally* (e.g. debugging a reproducer), setting `ARCHON_SUPPRESS_NESTED_CLAUDE_WARNING=1` lets you silence the warning while still getting the env scrub.
- The pattern generalizes: any "child process inherits markers that the parent set for itself" class of bug can deadlock. When integrating with a host tool, audit which env vars the host sets on itself and strip them before spawning siblings of the host.
- This is specifically Claude Code behavior — it may be fixed in future SDK versions. Verify each SDK upgrade whether the strip is still necessary.

## Evidence

- `packages/paths/src/strip-cwd-env.ts:68-93`: the full CLAUDE_CODE_* scrub pass, auth-var allowlist at lines 30-34.
- Stderr warning at `strip-cwd-env.ts:72-80` with suppression env var.
- `packages/paths/src/strip-cwd-env.ts:17-22` design comment names coleam00/Archon#1097 (SDK env leak) and coleam00/Archon#1067 (nested session warning PR).
- anthropics/claude-code#4619 referenced at `strip-cwd-env.ts:91-92` for NODE_OPTIONS / VSCODE_INSPECTOR_OPTIONS strip.
- Boot-time invocation at `packages/paths/src/strip-cwd-env-boot.ts` (imported as the first line of every CLI entry point).
- Commit SHA: d89bc767d291f52687beea91c9fcf155459be0d9.
