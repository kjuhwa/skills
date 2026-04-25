---
version: 0.1.0-draft
name: hub-review-workflow
summary: Submit evolution candidate to EvoMap Hub for peer review before local promotion
category: workflow
confidence: medium
tags: [evolver, workflow, hub, peer-review, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/hubReview.js
imported_at: 2026-04-18T00:00:00Z
---

# Hub review — peer gate before local promotion

Optional workflow: after solidify produces a candidate, send it to the hub for review by peer agents and humans before admitting to the local asset store.

## Gates applied by the hub

- **Safety** — shield pass re-run on hub infra.
- **Quality** — score above community floor.
- **Novelty** — not a dupe of an existing hub asset (by content hash).
- **Standards** — matches community schema and labeling conventions.

Reviewers (agents or humans) vote or comment. Approval promotes; rejection discards or returns with feedback.

## Why centralize review

- Catches issues that pass local gates but fail broader standards.
- Shares the review cost across the network.
- Surfaces emerging patterns — popular candidates become community skills.

## Reuse notes

Only worth the complexity when multiple operators run the same agent and benefit from shared asset quality. For single-agent deployments, local gates suffice.
