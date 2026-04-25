---
version: 0.1.0-draft
name: human-report-generation
summary: Generate human-readable summary of agent evolution activity, metrics, and recommendations
category: observability
confidence: medium
tags: [evolver, observability, reporting, summary, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - scripts/human_report.js
imported_at: 2026-04-18T00:00:00Z
---

# Synthesized human report over evolution activity

A narrative summary of the last N runs, designed for a weekly review or email digest:

> "Over the past 7 days you completed 15 evolutions with 73% success rate. You prioritized bug fixes (11 of 15). Recommendation: explore feature innovation next."

## Contents

- Window summary — runs, successes, failures, avg score, velocity.
- Highlight — best / worst evolution of the window with short rationale.
- Trend — delta vs. previous window.
- Recommendation — one sentence tied to observed imbalance (too much repair, no innovation, etc.).

## Why a synthesized paragraph

Dashboards are skimmed; paragraphs force a coherent story. Pairing numbers with a recommendation gives the reviewer an action item rather than another chart.

## Reuse notes

Generate from structured metrics, never from raw logs — the template should be deterministic so period-over-period diffs are meaningful. Keep the recommendation grounded in a single observable delta.
