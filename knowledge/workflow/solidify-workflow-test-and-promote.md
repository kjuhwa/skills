---
version: 0.1.0-draft
name: solidify-workflow-test-and-promote
summary: Solidify workflow — write candidate prompt, run canary test, validate, promote to assets
category: workflow
confidence: high
tags: [evolver, workflow, canary, promotion, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/solidify.js
  - src/canary.js
  - src/gep/integrityCheck.js
imported_at: 2026-04-18T00:00:00Z
---

# Solidify = write → canary → validate → promote

After the agent proposes a mutation, solidification is a four-step pipeline before anything lands in the durable asset store.

## Steps

1. **Write candidate** — serialize prompt + metadata to a tempfile.
2. **Canary** — run the agent against a fixed test suite with the candidate active.
3. **Integrity check** — confirm the test output is parseable and sane (no silent exits, no truncated streams).
4. **Score + promote** — compute `pass_rate`, `avg_latency`, `error_distribution`. If score ≥ threshold (e.g., 0.78), emit `gene` or `capsule` event and add to the asset store.

## What makes this worth copying

- Every stage is a clear gate with a clear artifact — easy to resume or replay.
- Canary tests run the mutation in isolation against a known suite, so you never promote based on self-reported success.
- Integrity check catches the subtle failure mode where tests "pass" because they never ran.

## Reuse notes

Applies to any self-modifying system: config generators, prompt optimizers, code-writing agents. Substitute canary for "your gold-standard eval harness" and keep the four gates.
