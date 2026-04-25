---
version: 0.1.0-draft
name: pre-broadcast-log-sanitization
summary: Before any autonomous process ships logs or error context to an upstream target (issue tracker, hub API, telemetry), it must redact secrets, absolute paths, emails, and host fingerprints at the entry point — not on the way out.
category: security
confidence: medium
tags: [security, sanitization, redaction, secrets, pii, autonomous-agent, log-broadcast]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 4c51382092f9cb125d3ec55475861ead8d1463a6
source_project: evolver
imported_at: 2026-04-18T02:45:00Z
---

# Pre-Broadcast Log Sanitization

## Threat model

An autonomous daemon (evolver, monitoring agent, bug reporter) routinely packages:

- Recent log lines (may contain env var expansions, request bodies, stack traces).
- Environment fingerprint (hostname, username, paths).
- Error message strings (may echo configuration values back out).

…and sends them somewhere less trusted than the host: a public issue tracker, a third-party observability endpoint, a shared mailbox. One leaked token = one compromise.

## Redact on entry, not on exit

The rule of thumb: the payload that gets written to local disk or held in memory should **already be redacted**. If you redact only inside the `POST` call, an earlier `console.log` or crash-dump already leaked the raw form.

## Patterns to match (minimum)

- **Credential-shaped strings.** Known provider prefixes: AWS (`AKIA…`, `ASIA…`), Google (`AIza…`), GitHub (`ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`), Slack (`xox[bpoa]-`), generic bearer (`Bearer [A-Za-z0-9._\-]{16,}`), PEM headers (`-----BEGIN [A-Z ]+ PRIVATE KEY-----`).
- **Absolute paths** under user home or system roots. Replace with `~/` or a fixed marker so structure is preserved but identity is not (e.g. `C:\Users\jane\project\…` → `~/project/…`).
- **Email addresses.** `[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}` — redact the local part; keep the domain only if domain identity is the point (`***@company.com`).
- **Hostnames / device fingerprints.** If you must send them, hash them (stable salt) so two reports from the same host correlate without naming it.
- **Custom patterns from config.** Let operators add regexes via env / file; apply them alongside the built-in set.

## Invariants

- **Fail-closed.** If redaction throws, drop the payload. A broken sanitizer must never fall through to "send the original."
- **Unit-test each pattern.** Each regex gets at least one positive and one negative case. Over-redaction is preferred to under-redaction, but "everything is `[REDACTED]`" is also a failure mode.
- **Version the sanitizer.** Include `sanitizer_version: N` in the body so downstream reviewers know what rules were applied.
- **Never log the raw payload at any level.** Not `debug`, not `trace`, not "just while we're developing."

## When patterns need to grow

Most leaks are discovered post-hoc: someone sees a token in an issue, files a fix, patch adds a new regex. Treat the pattern set as a living document. A single PR in the evolver repo (PR #107) added 11 new credential patterns in one go — expect yours to grow the same way.

## Source

- Evolver's pre-broadcast sanitization, hardened across multiple PRs. Public surface is the `envFingerprint` + sanitize helpers under `src/gep/`. The specific regexes aren't reusable as-is — write your own based on the providers and path shapes you actually emit.
