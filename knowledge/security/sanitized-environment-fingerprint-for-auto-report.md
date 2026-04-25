---
version: 0.1.0-draft
name: sanitized-environment-fingerprint-for-auto-report
summary: Before an autonomous process files a public bug report (GitHub issue, telemetry event, hub submission), pass every string field through a centralized `redactString()` and include only a fixed allowlist of env-fingerprint fields — version, node version, platform/arch, container flag, truncated node id. Never include hostname, cwd, env dump, or raw logs.
category: security
tags: [pii, sanitization, redaction, auto-reporting, env-fingerprint, allowlist]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 4c51382092f9cb125d3ec55475861ead8d1463a6
source_project: evolver
source_paths:
  - src/gep/issueReporter.js
  - src/gep/envFingerprint.js
  - src/gep/sanitize.js
imported_at: 2026-04-18T03:00:00Z
---

# Env Fingerprint + Allowlist Redaction for Public Reports

Auto-reporting is useful, but every string you emit is a chance to leak something private. Evolver's pre-broadcast pipeline enforces two rules that are easy to copy elsewhere.

## Rule 1 — Everything goes through `redactString()`

There is a single redactor with an ever-growing list of patterns (tokens, absolute paths, emails, JWTs, API keys). Every field — titles, bodies, event-row reasons, log excerpts — is passed through it before concatenation. One chokepoint, not N.

Known categories (from PR #107, 11 new patterns added):

- `ghp_…`, `github_pat_…`, generic bearer tokens
- Absolute filesystem paths (`/Users/…`, `/home/…`, `C:\Users\…`)
- Email addresses
- Anything matching common secret prefixes

If you're adding a new string-producing feature, the acceptance criterion is: does every string exit through `redactString()`? Not "did I add redaction in this path?"

## Rule 2 — Env fingerprint is an allowlist, not a dump

`captureEnvFingerprint()` returns a *fixed* small object:

```js
{
  evolver_version: '1.67.1',
  node_version: 'v20.11.0',
  platform: 'linux',
  arch: 'x64',
  container: true,        // boolean, not the container id
}
```

That's it. No `process.env`, no hostname, no cwd, no user. If you need a node identity, use the **truncated** node id (first 10 chars + `...`). Truncation makes correlation possible while preventing full-ID enumeration.

## Additional guards worth copying

- **Log truncation to the tail.** `sessionLog.slice(-2000)` — the crash is at the end, and you bound the blast radius of a sanitizer miss.
- **Reason-column cap.** In event tables, truncate each `outcome.reason` to 80 chars before redacting. Shorter strings are easier to audit.
- **Report ID.** `sha256(nodeId + now + errorSig).slice(0, 12)` gives each issue body a unique correlation handle without leaking raw node id.

## Anti-patterns to watch for

- Embedding `JSON.stringify(process.env)` "just for debugging."
- Attaching raw log files instead of a truncated excerpt.
- Printing the full `os.hostname()` (most orgs consider hostnames sensitive).
- Logging the request body of the GitHub POST for local debugging — that *already-sanitized* body still contains your generated Report ID and nodeId prefix.
