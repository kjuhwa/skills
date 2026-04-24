---
name: auto-issue-reporter-streak-cooldown
description: Let a long-running autonomous process auto-file GitHub issues on its own persistent failures, gated by a consecutive-streak threshold and a per-signature cooldown so a single flaky resource cannot spam the tracker.
category: observability
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [github, issues, auto-report, cooldown, streak, observability, autonomous-agent]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 4c51382092f9cb125d3ec55475861ead8d1463a6
source_project: evolver
imported_at: 2026-04-18T02:45:00Z
---

# Auto Issue Reporter with Streak + Cooldown

## When

A background daemon fails in ways that no single run can recover from (env misconfig, upstream API shape change, persistent resource exhaustion). You want it to open a GitHub issue on the upstream repo so maintainers see it, without drowning the issue tracker.

## Gate (all must be true to file)

1. **Consecutive failure streak ≥ threshold** (e.g. `EVOLVER_ISSUE_MIN_STREAK=5`). Single-shot failures never file. Transient flakes self-heal before they hit the threshold.
2. **Error signature not in cooldown.** Hash `(error_class, top-frame, sanitized_message)` into a signature; suppress the signature for `EVOLVER_ISSUE_COOLDOWN_MS` (default 24h) after a successful file.
3. **Token present.** `GITHUB_TOKEN` / `GH_TOKEN` / `GITHUB_PAT` — silently no-op if missing. Never crash the loop because the reporter can't speak HTTP.
4. **Feature not disabled.** Kill-switch env var (`EVOLVER_AUTO_ISSUE=false`) short-circuits everything above.

## Body redaction (mandatory before POST)

Sanitize the body against **all** of:

- Known secret patterns (tokens, API keys, AWS/GCP/stripe-style prefixes).
- Absolute paths that start with user home or system-specific roots (replace with `~/` or a redaction marker).
- Email addresses.
- Custom fingerprints injected by your own config (e.g. hostnames, org IDs).

Failing open (posting an un-redacted body) is the worst outcome; prefer failing the report entirely over leaking.

## Env knobs

| Var | Default | Purpose |
|---|---|---|
| `EVOLVER_AUTO_ISSUE` | `true` | Master switch |
| `EVOLVER_ISSUE_REPO` | upstream `owner/repo` | Target repo for filing |
| `EVOLVER_ISSUE_MIN_STREAK` | `5` | Consecutive failures required |
| `EVOLVER_ISSUE_COOLDOWN_MS` | `86400000` | Per-signature suppression window |

## Rules

- **Dedupe by signature, not title.** Titles vary; signatures don't.
- **Persist cooldown state across restarts.** A simple `~/.evolver/issue-cooldowns.json` keyed by signature is enough; write through on each file.
- **Never auto-close.** The loop files; a human closes. Auto-close on "next success" masks flaky issues.
- **Record the issue URL in the event log.** Loop operators need to follow it without tailing GitHub API responses.

## Anti-patterns

- Filing on every failure. Tracker becomes useless within a week.
- Hashing the signature over the full body (paths, timestamps, PIDs). Every failure looks unique; cooldown never fires.
- Redacting after you've already written the body to a local log. The leak is already on disk — redact at the entry point, not at the exit.
