---
version: 0.1.0-draft
name: domain-driven-implementation-pitfall
description: Common failure modes when building tools that model bounded contexts, aggregates, and ubiquitous language
category: pitfall
tags:
  - domain
  - auto-loop
---

# domain-driven-implementation-pitfall

The most frequent pitfall is treating bounded contexts as mere namespaces or folders — the tool then renders them as colored groupings with no semantic weight, and users cannot tell a Shared Kernel from a Conformist relationship. Context relationships are directional and power-asymmetric (upstream shapes downstream), and the data model must encode that direction plus the pattern type; a flat `contextA.relatedTo(contextB)` edge loses exactly the information DDD practitioners came for. A related trap is allowing aggregates to visually or structurally reference entities in other contexts directly — this contradicts the core DDD rule that cross-context references go through IDs and translation layers, and tools that render a line from `Order.customerId` straight into the CRM `Customer` entity teach the wrong mental model.

Invariant simulation fails when invariants are stored as free-text strings rather than evaluable predicates: the simulator can display them but cannot actually check them, so "violation" becomes a manual toggle instead of emergent behavior. Always store invariants as pure functions over aggregate state (or a DSL that compiles to one), and evaluate after every command. A subtler bug is evaluating invariants mid-command rather than at the aggregate-transaction boundary — real DDD invariants are only required to hold between commands, not during, so a simulator that flags transient intermediate states produces false positives that erode trust.

For ubiquitous-language mining, naive tokenization and global frequency counts miss the whole point: the same word ("customer", "account", "policy") legitimately means different things in different contexts, and a tool that merges them into one hot term is worse than no tool. Scope term extraction per-context, then do a second pass specifically looking for cross-context collisions and near-synonyms — that cross-context view is the actual deliverable. Also beware over-indexing on nouns; verbs carry the ubiquitous language too ("ship", "settle", "adjudicate") and their context-specific meanings are often where translation drift hides.
