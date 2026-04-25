---
name: candidate-elevation-with-success-streak
description: Track success streak and elevate low-confidence external assets after repeated validation
category: workflow
version: 1.0.0
version_origin: extracted
confidence: high
tags: [evolver, workflow, trust, federation]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/a2a.js
  - src/gep/candidateEval.js
imported_at: 2026-04-18T00:00:00Z
---

# Success-streak elevation for external assets

External assets arrive with lowered initial confidence (e.g., multiplied by 0.6). Track a per-asset success streak across evolution events. Only broadcast or promote assets that reach both:
  - a streak threshold (e.g., 2 consecutive successes), and
  - a confidence floor (e.g., score ≥ 0.7).

Failures reset the streak, forcing the asset to re-earn trust. Keeps noisy third-party contributions out of the local knowledge base while letting proven imports graduate.

## Mechanism

1. Persist per-asset counters `{ successes, failures, streak, last_success_at }`.
2. After each evolution, update the counter atomically.
3. Gate outbound broadcasts and local promotions on the streak + score predicate.
4. Emit a log event on graduation / demotion for auditability.

## When to reuse

Federated agent networks, plugin marketplaces, crowd-sourced config packs — any place where imported artifacts should be provisional until proven.
