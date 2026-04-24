---
name: validation-command-allowlist-gate
description: Before executing an "arbitrary" validation command supplied by data (plugin config, ingested asset, user rule), pass it through a layered allowlist that rejects anything outside a known-prefix whitelist, substitution syntax, or shell operators, and then run it scoped and time-bound.
category: security
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [security, shell, command-injection, allowlist, validation, sandbox]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 4c51382092f9cb125d3ec55475861ead8d1463a6
source_project: evolver
imported_at: 2026-04-18T02:45:00Z
---

# Validation Command Allowlist Gate

## Problem

You accept "validation" or "precheck" commands from config files / ingested assets / plugin manifests, then execute them. Without gating, that's arbitrary RCE at the trust boundary.

## Gate (apply in order; any failure = reject)

1. **Prefix whitelist** — the stripped command must start with an exact token from a small set, e.g. `node`, `npm`, `npx`. No regex globs; exact word match followed by whitespace or end-of-string.
2. **No command substitution** — reject if the raw string contains `` ` `` or `$(` anywhere. Do this on the raw input; do not try to "escape" it.
3. **No shell operators (after quote stripping)** — strip single- and double-quoted substrings, then reject if `;`, `&`, `|`, `>`, `<` appears. Stripping quotes first prevents false positives on literal flags like `--match=">=1.0"`.
4. **Timeout** — each command runs with a hard wall clock cap (e.g. 180s). Kill the process tree on expiry.
5. **Scoped cwd** — run with `cwd` explicitly set to the project/repo root; never inherit the parent's cwd.
6. **No shell** — spawn with `shell: false` and split the command into `argv`, so no reinterpretation happens at exec time.

## Promotion rules for ingested assets

When validation commands arrive from an external source (a2a ingest, hub sync, user-pasted config):

- Stage in an **isolated candidate zone** first; never execute during ingest.
- Require an explicit `--validated` flag / human confirmation before **promoting** the asset into the active store.
- Re-audit the validation commands at promotion time (the gate above), and **reject promotion** if any command fails the gate — the whole asset, not just the command.
- Never overwrite an existing asset with the same ID (no silent replacement).

## Anti-patterns

- "Just escape the string." Quoting rules differ by shell; the safe move is to never hand the string to a shell.
- Letting the command run `bash -c`. That defeats every layer above.
- Treating the allowlist as a denylist. Denylists always leak.
