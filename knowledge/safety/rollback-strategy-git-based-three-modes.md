---
version: 0.1.0-draft
name: rollback-strategy-git-based-three-modes
summary: Three rollback modes for failed evolution — hard reset, stash, or none
category: safety
confidence: high
tags: [evolver, safety, rollback, git, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/solidify.js
  - index.js
imported_at: 2026-04-18T00:00:00Z
---

# Three rollback modes, controlled by env var

Self-modifying systems need a clear, operator-visible rollback policy. Evolver exposes three modes via `EVOLVER_ROLLBACK_MODE`:

| Mode | Command | When to pick |
| --- | --- | --- |
| `hard` | `git reset --hard HEAD` | Default. Strongest guarantee; loses debug state. |
| `stash` | `git stash push -u` | Debugging; keeps the failed mutation for inspection. |
| `none` | (no op) | Agent/operator will clean up manually (CI, nested workflows). |

Compute **blast radius** before rollback (files touched, lines changed, dependencies affected) so the log captures what was reverted.

## Why this matters

- One env var changes risk posture without redeploying the agent.
- `stash` preserves evidence for post-mortems without pushing junk upstream.
- `none` allows the pattern to compose with outer rollback systems (e.g., container re-creation, DB transactions).

## Reuse notes

Applies to any code-mutating agent. The same three-mode shape generalizes to DB migrations (`ROLLBACK_MODE=abort|savepoint|none`) and config pushes.
