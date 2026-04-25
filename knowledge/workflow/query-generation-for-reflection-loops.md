---
version: 0.1.0-draft
name: query-generation-for-reflection-loops
summary: Generate targeted questions for agents to reflect on evolution performance and blind spots
category: workflow
confidence: medium
tags: [evolver, workflow, reflection, metacognition, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/questionGenerator.js
imported_at: 2026-04-18T00:00:00Z
---

# Auto-generated reflection questions

An agent that only sees its own summary statistics rarely notices blind spots. A question generator turns anomalies in the metric stream into natural-language prompts for the next reflection pass.

## Heuristics

- If fix-class mutations fail disproportionately → "Why are fixes failing more than features?"
- If one skill area has zero activity this window → "Have you explored X recently?"
- If a streak just broke after 5+ successes → "What changed between success and the recent failure?"

## Why this beats static reflection prompts

Static prompts drift: the agent learns to answer them in stock phrases. Dynamic prompts tied to the observed metric deltas stay fresh and force attention onto the current weak spot.

## Reuse notes

Applicable to any agent loop with a metrics feed. The generator itself is tiny — a small rules table mapping metric-anomaly → question template. The hard part is picking the right anomalies to surface.
