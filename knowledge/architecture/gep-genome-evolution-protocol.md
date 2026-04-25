---
version: 0.1.0-draft
name: gep-genome-evolution-protocol
summary: Protocol for tracking and applying genome mutations as evolution genes and capsules
category: architecture
confidence: high
tags: [evolver, architecture, gep, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - README.md
  - SKILL.md
  - src/gep/
imported_at: 2026-04-18T00:00:00Z
---

# GEP — Genome Evolution Protocol

GEP is Evolver's core mechanism for tracking agent self-evolution. Two primary asset types:

- **Gene** — a small, content-addressed unit: prompt fragment, behavioral tweak, heuristic.
- **Capsule** — a larger validated bundle: `prompt + tests + metadata`, promoted only after repeated successful validation.

## Lifecycle

1. **Analyze** — the agent inspects its runtime logs and event stream.
2. **Propose** — it selects candidate improvements and produces a mutation.
3. **Validate** — the mutation is run through canary tests; outcomes become events.
4. **Solidify** — mutations with sufficient success streak and score are promoted to genes or capsules.

## Identity and integrity

Every asset is addressed by a content hash — identical bodies collapse to a single identity across agents. A success-streak counter and confidence score ride along on each asset.

## Why track this

- Auditability — every behavior change traces back to a specific event and diff.
- Composability — genes stack; capsules version together.
- Federation — content-addressed assets let a network of agents converge on the same canonical artifacts.

## Reuse notes

Adopt the *shape* (content-address, success streak, confidence, canary gate) before you adopt the name. The minimal useful surface is: hash, score, streak, and an append-only event log.
