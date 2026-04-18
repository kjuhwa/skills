---

name: domain-driven-data-simulation
description: Generating synthetic bounded contexts, aggregates, and corpus text for DDD tooling demos
category: workflow
triggers:
  - domain driven data simulation
tags: [workflow, domain, driven, data, simulation, synthetic]
version: 1.0.0
---

# domain-driven-data-simulation

Seed simulations from a small fixed catalog of realistic domains (e-commerce, healthcare claims, logistics, banking) rather than inventing generic Foo/Bar contexts — DDD tooling only feels credible when the ubiquitous language is recognizable. For each seed domain, define 3–6 bounded contexts with explicit upstream/downstream relationships, 2–5 aggregates per context with a designated root and 1–3 invariants expressed as predicates (e.g., `order.total === sum(lineItems.price * quantity)`, `claim.status === 'APPROVED' ⟹ claim.approvedBy !== null`). Generate entity instances by sampling field values from context-appropriate distributions: money amounts lognormal, dates clustered around "now" with a tail, identifiers as ULIDs prefixed with the aggregate name. Persist the seed and expose a "regenerate" button so demos are reproducible but explorable.

For aggregate-invariant simulators, drive state transitions through a command stream rather than direct field edits — each command is (aggregate-id, command-name, payload), and the simulator applies it, re-evaluates all invariants, and records a transition record (pre-state, command, post-state, violated-invariants[]). This gives you a replayable timeline and lets visualization scrub through history. Inject deliberate violations at ~10–15% rate so the UI's invariant-violation path is always exercised during demos. For ubiquitous-language mining, synthesize corpus text by templating sentences from a per-context vocabulary ("The {actor} {verb}s the {noun} when {condition}") and intentionally seed 2–3 translation-drift cases where the same concept appears with different terms across contexts — that's the insight the tool exists to surface.
