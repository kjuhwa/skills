---
name: failure-streak-cooldown-auto-issue-report
description: When a long-running agent hits a repeating failure, file one GitHub issue — not ten — by combining a minimum-streak threshold, a per-error-signature cooldown, an open-issue search for de-duplication, and sanitized logs, then persist the decision in a local state file so the next run resumes the throttle.
category: observability
version: 1.0.0
version_origin: extracted
tags: [error-reporting, throttle, cooldown, github-api, sanitization, daemon]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 4c51382092f9cb125d3ec55475861ead8d1463a6
source_project: evolver
source_paths:
  - src/gep/issueReporter.js
  - README.md (Auto GitHub Issue Reporting)
imported_at: 2026-04-18T03:00:00Z
---

# Auto Issue Reporting with Streak + Cooldown + De-dup

Problem: a daemon that self-repairs can enter a failure loop. You want *one* heads-up issue on the upstream repo, not a flood. The pattern below is the minimum that behaves well in production.

## The four gates

Only file an issue if **all four** are true:

1. **Symptom gate** — the failure-signal set contains either `failure_loop_detected`, or (`recurring_error` AND `high_failure_ratio`). Transient errors never file.
2. **Streak gate** — the consecutive-failure counter is ≥ `minStreak` (default 5). Single flukes never file.
3. **Cooldown gate** — `now - lastReportedAt ≥ cooldownMs` (default 24h) **OR** the current error signature is not in the `recentIssueKeys` ring buffer (last 20). So a brand-new failure mode bypasses the cooldown; a familiar one is suppressed.
4. **Open-issue gate** — before POSTing, query `GET /search/issues?q=repo:X is:issue is:open "<title>"`; if an open match exists, record the hit but do not file a duplicate.

All gates default to "do not report." Missing GitHub token → silently skip.

## Stable error key (for the cooldown ring)

Do **not** key cooldown on the full error message — it mutates. Instead:

```js
const keyed = signals
  .filter(s => s.startsWith('recurring_errsig') || s.startsWith('ban_gene:')
            || s === 'recurring_error'         || s === 'failure_loop_detected'
            || s === 'high_failure_ratio')
  .sort()
  .join('|');
const errorKey = sha256(keyed || 'unknown').slice(0, 16);
```

A failure's "identity" is the sorted set of structural signals. Two manifestations of the same underlying bug produce the same 16-char key and collapse into one cooldown.

## State persistence (survives restart)

```json
// memory/evolution/issue_reporter_state.json
{
  "lastReportedAt": "2026-04-17T08:00:00.000Z",
  "recentIssueKeys": ["abc123...", "def456...", "..."],
  "lastIssueUrl": "https://github.com/owner/repo/issues/1234",
  "lastIssueNumber": 1234,
  "lastSkippedAt": "2026-04-18T02:30:00.000Z"
}
```

Ring size 20 is plenty — the cooldown window is longer than you'll ever accumulate distinct keys for.

## Sanitization is non-optional

Every string that goes into the issue body passes through a redactor that masks tokens, absolute paths, emails, and anything resembling a secret. Truncate logs to the **tail** (`slice(-2000)`) — that's where the crash actually is, plus it bounds the blast radius of a sanitizer miss.

Also include sanitized-only fields:

- Evolver/runtime version (fine)
- Platform + arch (fine)
- Truncated node id (`abc1234567…`)
- Recent events as a table (reason column capped at 80 chars)

Never include: full PATH, full cwd, hostname, env dump.

## Configurable envelope

| Env var | Default | Purpose |
|---|---|---|
| `EVOLVER_AUTO_ISSUE` | `true` | Kill switch |
| `EVOLVER_ISSUE_REPO` | `owner/repo` | Target repository |
| `EVOLVER_ISSUE_COOLDOWN_MS` | `86400000` | Per-signature window |
| `EVOLVER_ISSUE_MIN_STREAK` | `5` | Minimum consecutive failures |
| `GITHUB_TOKEN` (or `GH_TOKEN`, `GITHUB_PAT`) | — | Auth, resolved in that order |

The token-env fallback chain matters: CI uses `GITHUB_TOKEN`, local dev uses `GH_TOKEN` or `GITHUB_PAT`. Accept all three.

## Failure handling of the reporter itself

The issue poster is **best-effort**. Wrap the whole thing in try/catch; on failure, log one line and continue the main loop. Never let the observability subsystem wedge the thing being observed.
