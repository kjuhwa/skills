---
name: skill-distiller-from-evolution-patterns
description: Extract reusable skill templates from successful evolution patterns and metadata
category: workflow
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [evolver, workflow, skill-extraction, meta-learning]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/skillDistiller.js
imported_at: 2026-04-18T00:00:00Z
---

# Distilling skills from successful evolution runs

Scan successful evolution events for patterns that generalize. Promote each match to a reusable skill template with prompt, preconditions, and expected outcome.

## Heuristics for "solidify-worthy"

- **Pure**: mutation body contains no env-specific paths or secrets.
- **Bounded**: diff size under a threshold; single concern.
- **Confident**: success streak ≥ N, score ≥ floor.
- **Novel**: content-hash not already present in the skill library.

## Mechanism

1. Query event log for `status=success` in the last window.
2. Group by mutation intent (via tag or classifier).
3. For each group, synthesize the skill body (name, description, prompt template, test).
4. Stage under a drafts directory; require a reviewer step before promoting.

## When to reuse

Self-improving agent loops, codebase-migration assistants, or any system that learns repeatable patterns from its own successful actions.
