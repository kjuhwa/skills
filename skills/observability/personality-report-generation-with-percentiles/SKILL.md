---
name: personality-report-generation-with-percentiles
description: Generate human-readable personality report with success rates, velocity, and trait analysis
category: observability
version: 1.0.0
version_origin: extracted
confidence: high
tags: [evolver, observability, reporting, agent-telemetry]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - scripts/gep_personality_report.js
imported_at: 2026-04-18T00:00:00Z
---

# Human-readable personality report

Render an agent's rolling personality state as a terminal-friendly report: success rate, velocity (events/day), and trait scores, each padded into fixed-width columns with single-digit summaries and ASCII spark-lines.

## Why

Operators skim many dashboards; a 20-line text report that always lines up is faster to read than JSON or a chart for routine health checks.

## Mechanism

1. Read last N events from the event JSONL.
2. Aggregate: `{ success, fail, score_avg, per_day_rate }`.
3. Derive traits (risk-taking, innovation, repair focus) as 0–9 scores.
4. Render with `padEnd`/`padStart` into fixed columns.

## When to reuse

Agent-loop dashboards, nightly email digests, CLI health-checks, anything where a fixed-width text artifact beats a chart for signal density.
