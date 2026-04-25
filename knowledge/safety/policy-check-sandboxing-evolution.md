---
version: 0.1.0-draft
name: policy-check-sandboxing-evolution
summary: Enforce evolution policies — no self-modification, no external network, no file deletions
category: safety
confidence: medium
tags: [evolver, safety, policy, sandbox, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/policyCheck.js
imported_at: 2026-04-18T00:00:00Z
---

# Pre-apply policy checks for self-evolving systems

Before applying a mutation, run it through a policy gate. Baseline policies worth enforcing:

- **No self-modification** — the mutation must not touch the evolution engine's own source.
- **No outbound network** — no new `fetch` / `http.request` call sites, except to the allow-listed hub.
- **No destructive ops** — no `fs.rm`, `fs.unlink`, `rimraf`, `rm -rf`. Additions and edits only.
- **No shell escape hatches** — no `exec`, `spawn('bash')`, `eval`.
- **Bounded diff** — max lines / max files changed.

Violations block promotion and emit a `policy_violation` event for audit.

## Why this is critical

Self-modifying code is the sharpest footgun in the agent toolbox. Policies convert "implicit trust in the model's judgment" into explicit, reviewable rules.

## Reuse notes

Start with a tiny allow-list and deny everything else. Add policies as need arises; never loosen existing ones silently. Treat the policy file like a security boundary — PRs changing it need dedicated review.
