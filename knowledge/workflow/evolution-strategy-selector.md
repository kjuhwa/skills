---
version: 0.1.0-draft
name: evolution-strategy-selector
summary: Select evolution strategy (balanced, innovate, harden, repair-only, early-stabilize) by context
category: workflow
confidence: medium
tags: [evolver, workflow, strategy, mode-selection, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/strategy.js
imported_at: 2026-04-18T00:00:00Z
---

# Named strategies instead of a dial

Rather than exposing a dozen tuning knobs, Evolver ships five named strategies. Each is a preset over candidate selection and validation rigor:

| Strategy | Selection bias | Validation |
| --- | --- | --- |
| `balanced` | mix of innovation + fix | standard gate |
| `innovate` | novel genes, higher risk | stricter canary |
| `harden` | prioritize fixes | same gates, longer canary |
| `repair-only` | only fixes; no features | default |
| `early-stabilize` | quick wins after churn | light gates, streak-only |

Choose based on agent maturity, recent failure rate, and goals. Switching is a single env var.

## Why named presets

- Operators don't need to read the config to understand the run.
- Log events include the strategy name — post-hoc analysis is easy.
- Adding a strategy is adding a preset; no new dials proliferate.

## Reuse notes

Maps cleanly onto any automation surface where "conservative / balanced / aggressive" is a meaningful choice: deployment cadence, infra scaling, prompt optimization.
