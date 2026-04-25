---
version: 0.1.0-draft
name: self-pr-mutation-contribution
summary: Auto-create pull requests for mutations back to public repo when confidence and streak thresholds met
category: workflow
confidence: medium
tags: [evolver, workflow, self-pr, contribution, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/selfPR.js
imported_at: 2026-04-18T00:00:00Z
---

# Self-PR — agent contributes back upstream

When a mutation clears a high bar (e.g., score ≥ 0.85 and streak ≥ 3), optionally open a PR back to the public repo the agent is running against.

## PR contents

- Mutation diff (isolated from agent-specific config).
- Canary test results and reproduction steps.
- Motivation: which event(s) prompted the mutation.
- `Signed-off-by` and source-of-origin metadata so maintainers can audit provenance.

Maintainers merge, close, or comment. Feedback feeds back into the agent's strategy.

## Why let the agent push

- Closes the loop: local learnings reach upstream users.
- Provides a clean pressure test — external reviewers catch failures no local gate would.
- Logged as a first-class evolution event so the system tracks its own contribution rate.

## Reuse notes

Gate aggressively: high confidence, high streak, small diff, no secrets. Wrap with a human approval step for anything outside a well-understood area. The feature is high-leverage but high-blast-radius if misconfigured.
