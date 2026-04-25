---
name: personality-state-tracking-with-aggregation
description: Aggregate agent evolution metrics into personality state (success rate, velocity, trait vectors)
category: observability
version: 1.0.0
version_origin: extracted
confidence: high
tags: [evolver, observability, personality, metrics]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/personality.js
  - scripts/gep_personality_report.js
imported_at: 2026-04-18T00:00:00Z
---

# Personality state from rolling evolution metrics

Maintain a personality object aggregated from recent evolution events:
- success/failure counts, average score
- velocity (events per day)
- trait scores (risk aversion, innovation bias, repair tendency), normalized to [0,1]

Computed on demand from the event log — no separate write path. Gives agents introspection into their own behavior and helps humans spot drift.

## Mechanism

1. Tail the last N events (e.g., 5000) from the event JSONL.
2. Bucket by outcome; sum scores; compute rate and velocity.
3. Derive traits via weighted combinations of event tags (e.g., `rollback` events → risk aversion).
4. Clamp to [0,1], round to 2 decimals, surface through a status endpoint and human-readable report.

## When to reuse

Agent dashboards, long-running worker health pages, any system where emergent behavior benefits from a summary vector rather than raw event traversal.
