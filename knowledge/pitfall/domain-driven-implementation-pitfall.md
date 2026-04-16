---
name: domain-driven-implementation-pitfall
description: Common failure modes when building DDD visualization tools — conflating tactical and strategic views
category: pitfall
tags:
  - domain
  - auto-loop
---

# domain-driven-implementation-pitfall

The most frequent pitfall is **flattening the strategic/tactical distinction**: rendering bounded contexts and aggregates in the same visual hierarchy so users can't tell which is which. Aggregates inside Context A should never be drawn as siblings of Context B. Enforce this with a strict two-level nesting rule in the renderer and reject data where an aggregate lacks a `contextId`. Related pitfall: treating every entity as an aggregate root — the generator and UI should distinguish aggregate roots (thick border) from internal entities (thin border, only visible on drill-down) or users will think every noun is a transactional boundary.

A second trap is **static layouts that don't survive domain growth**. Force-directed layouts (d3-force) look great with 10 nodes and become unreadable at 80+. Switch to a hierarchical layout (dagre or elk.js) for event-storm and aggregate-flow views, and reserve force-directed only for the context map where node count stays small. Persist manual node positions to localStorage keyed by domain-template-hash so user adjustments survive reloads — otherwise every page refresh destroys the layout work and users abandon the tool.

Finally, beware **event/command arrow-direction inversion**: commands flow *into* aggregates (request), events flow *out* (fact). Many implementations draw both as generic edges, making causality ambiguous. Use distinct edge styles (solid arrow for command→aggregate, dashed arrow with open arrowhead for aggregate→event, dotted for policy→command) and validate at data-load time that no command has an aggregate as source or event as target. Getting this wrong silently teaches users an incorrect mental model of CQRS/ES, which is worse than showing no diagram at all.
