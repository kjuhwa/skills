---
version: 0.1.0-draft
name: local-state-awareness-environment-detection
summary: Detect local environment state (workspace changes, git branch, filesystem) for evolution safety
category: observability
confidence: medium
tags: [evolver, observability, env-detection, safety, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/localStateAwareness.js
imported_at: 2026-04-18T00:00:00Z
---

# Pre-flight local-state probe

Before every evolution cycle, probe the local environment:

1. Current git branch, commit, dirty flag.
2. Presence of key files (package.json, tsconfig.json, test dir, lockfile).
3. Recently modified files (within last hour) that might indicate human edits in flight.
4. Process state (is the dev server running? is a CI run in progress?).

Aggregate into a `local_state` snapshot. Gate evolution on it: e.g., skip if the tree is dirty, warn if the branch changed since the last run.

## Why

An agent that evolves into a dirty working tree is likely to clobber active human work. A cheap pre-flight turns "mysterious data loss" into a visible gate.

## Reuse notes

Any automation that writes to a shared workspace (format-on-save loops, codemod agents, bot commits) can benefit. Make the gate fast — if it's slower than 300 ms, operators will disable it.
