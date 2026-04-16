---
name: domain-driven-implementation-pitfall
description: Common failures when modeling bounded contexts, aggregate streams, and ubiquitous language in code
category: pitfall
tags:
  - domain
  - auto-loop
---

# domain-driven-implementation-pitfall

The biggest trap is treating bounded contexts as folders rather than translation boundaries — apps collapse when a shared "User" type is imported across contexts, because the glossary app will then lie about the drift it is supposed to visualize. Enforce it structurally: each context owns its own TypeScript namespace/module with no cross-imports of domain types, only explicit ACL (anti-corruption layer) translators at the edges. If the bounded-context-mapper app shows Partnership or Shared-Kernel arrows that don't correspond to actual code-level sharing, the visualization becomes aspirational fiction.

Aggregate event streams frequently fail on replay correctness: developers store derived state alongside events and then can't reconstruct history. The fix is strict event-sourcing discipline — the aggregate-event-stream app must compute projections purely from the event log, never from cached snapshots, at least in demo mode. A second pitfall is unbounded aggregates: an "Order" aggregate that grows to 10,000 line-item events becomes unscrubbable. Cap aggregate lifetimes realistically (close/archive) and start new aggregates for new business cycles.

For ubiquitous language glossaries, the silent killer is definitions written by a single author in a single voice — real ubiquitous language emerges from conversation, so seed definitions with deliberate contradictions and "disputed" flags rather than authoritative-sounding prose. Also avoid synonym chains that collapse meaning (Customer→Client→Account→Customer) without context qualifiers; always attach the bounded-context tag to every synonym edge, or the graph will suggest false equivalences that undermine the whole point of context-specific language.
