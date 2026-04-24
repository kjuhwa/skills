---
name: validation-command-whitelist-gate
description: Before executing any user-supplied "validation" shell command, filter it through a binary prefix whitelist, reject all command-substitution forms, reject shell operators after stripping quoted regions, and enforce a hard per-command timeout and fixed cwd — so that even a fully attacker-controlled config string cannot escape to arbitrary command execution.
category: security
version: 1.0.0
version_origin: extracted
tags: [safety, shell, command-injection, whitelist, sandbox, config-driven-exec]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 4c51382092f9cb125d3ec55475861ead8d1463a6
source_project: evolver
source_paths:
  - README.md (Security Model section)
  - src/gep/solidify.js
imported_at: 2026-04-18T03:00:00Z
---

# Validation Command Whitelist Gate

A reusable safety check for the common pattern where a config file (gene, capsule, manifest, skill-yaml, CI job…) carries a `validation: [ "<cmd>", … ]` array that the host runtime must execute. Treat every entry as hostile input.

## The four-layer gate

Run all four in order; reject on first failure.

### 1. Binary prefix whitelist

Only allow commands whose first token is in a tiny, hard-coded set, e.g. `["node", "npm", "npx"]`. No `bash`, no `sh`, no `python -c`, no absolute paths like `/usr/bin/node`. If you find yourself wanting to expand the list, you are losing the battle — create a new validator type instead.

### 2. No command substitution

Reject if the raw string contains backticks `` ` `` **or** `$(` anywhere. These are the two primary shell-escape vectors and false positives are effectively zero in a validation context.

### 3. No shell operators — on a quote-stripped view

First remove anything inside matched single or double quotes, **then** check the remainder for `;`, `&`, `|`, `>`, `<`. Stripping quotes first prevents a legitimate literal like `node -e 'console.log("a;b")'` from being rejected, while still catching `node x && rm -rf /`.

### 4. Bounded execution

- Per-command timeout: 180 s (generous for tests, small enough that a hung command doesn't wedge the loop).
- Fixed `cwd`: the project root. Never inherit the caller's cwd.
- Do **not** spawn through a shell — use `execFile` / `spawn` with an argv array you split yourself. That neutralizes any residual operators that slipped past the string check.

## Reference predicate

```js
function isValidationCommandAllowed(cmd) {
  if (typeof cmd !== 'string' || !cmd.trim()) return false;

  // (2) command substitution
  if (cmd.includes('`') || cmd.includes('$(')) return false;

  // (3) shell operators, with quoted regions removed
  const stripped = cmd.replace(/'[^']*'|"[^"]*"/g, '');
  if (/[;&|<>]/.test(stripped)) return false;

  // (1) prefix whitelist
  const first = cmd.trim().split(/\s+/)[0];
  return ['node', 'npm', 'npx'].includes(first);
}
```

## Promotion-time re-audit

If the config comes from an external source (hub, marketplace, peer), re-run the same check **at the moment you promote the asset into the local store**, not just at execution time. Rationale: the local store is the trust boundary; once a gene is "accepted" local callers assume it's safe. Promotion requiring an explicit `--validated` flag makes the operator step visible in audit logs.

## Why this wins over "just sanitize"

- No regex-escape gymnastics, no allowlist of "safe flags."
- The rules are listable on a sticky note — reviewers can verify them.
- It composes: adding a new allowed binary is a one-line diff with obvious blast radius.

## Known sharp edges

- A whitelisted binary with its own shell-eval feature (`npm run <attacker-named-script>`) still needs a second layer — consider also whitelisting the sub-command for `npm`.
- `npx <pkg>` will download and execute arbitrary code from the registry; pair with `--no-install` or a registry allowlist if the threat model includes the supply chain.
