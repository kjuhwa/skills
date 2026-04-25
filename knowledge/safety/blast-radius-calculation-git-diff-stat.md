---
version: 0.1.0-draft
name: blast-radius-calculation-git-diff-stat
summary: Estimate evolution impact by computing git diff stats and change scope
category: safety
confidence: medium
tags: [evolver, safety, blast-radius, diff-stat, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/gitOps.js
imported_at: 2026-04-18T00:00:00Z
---

# Blast-radius estimate before applying change

Before applying an automated mutation, estimate its blast radius so downstream policy (auto-apply vs. human review) can decide correctly.

## Inputs

- `git diff --shortstat` — files changed, insertions, deletions.
- Changed-file paths mapped to owning subsystem (via a `CODEOWNERS`-like map).
- Test coverage of touched lines (from a coverage report).
- Presence of "hot" files (entry points, CI configs, security-sensitive paths).

## Output score

Combine inputs into a 0–1 score. Low scores auto-promote; high scores require review. Record both the score and its components in the event log so policy tweaks can be backtested.

## Why this matters

Automation policy should track impact, not mutation count. A 100-line refactor in a test file is safer than a 3-line change to the auth middleware. Blast radius captures that asymmetry.

## Reuse notes

Works for any system making automated source changes: bots, codemods, AI-assisted refactors. The scoring function is less important than *having* a scoring function that gates automation.
