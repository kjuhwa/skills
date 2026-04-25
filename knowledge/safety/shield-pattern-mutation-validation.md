---
version: 0.1.0-draft
name: shield-pattern-mutation-validation
summary: Validate mutations against shield patterns — unsafe regex, resource exhaustion, logic bombs
category: safety
confidence: medium
tags: [evolver, safety, shield, static-analysis, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/shield.js
imported_at: 2026-04-18T00:00:00Z
---

# Shield patterns — cheap static checks on generated code

Beyond policy gates, run a "shield" pass over every mutation to catch pathological patterns:

- **ReDoS-prone regex** — reject `/^(a+)+$/`-class patterns, cap pattern length at ~1024 chars.
- **Unbounded recursion / loops** — flag functions recursing without a depth argument or `while (true)` without a break guard.
- **Memory exhaustion** — flag `Buffer.alloc(untrusted)`, `new Array(huge)`, reading a file with `readFileSync` without size check.
- **Privilege escalation** — `process.setuid`, modifying `/etc`, writing into `node_modules` at runtime.
- **Logic-bomb heuristics** — date-conditional branches that only fire in the future (`if (Date.now() > …)`).

## Why static shields, not just tests

Tests catch what they exercise. Shields catch whole *categories* even when they slip past the suite. Shields should be cheap — a few regex + AST passes — so they can run on every mutation.

## Reuse notes

Adopt `eslint-plugin-security`, `semgrep`, or a project-specific rule bundle. Ensure the shield fails fast and emits a categorized event so policy tuning can target real hits.
