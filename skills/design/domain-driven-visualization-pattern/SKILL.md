---
name: domain-driven-visualization-pattern
description: Rendering bounded contexts, aggregates, and ubiquitous language as interactive, navigable domain maps
category: design
triggers:
  - domain driven visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# domain-driven-visualization-pattern

Domain-driven apps consistently benefit from a three-pane visualization shell: a left sidebar listing bounded contexts (or aggregates/glossary terms), a central canvas showing relationships (context maps, event streams, or term graphs), and a right inspector exposing the selected node's invariants, events, and language definitions. Use SVG or Canvas for the context-map layer (Partnership, Customer-Supplier, Conformist, Anti-Corruption Layer arrows each rendered with distinct stroke patterns) and HTML overlays for term cards so text remains selectable and searchable. Color-encode bounded contexts consistently across all three apps — each context gets a stable hue that carries over into aggregate borders and glossary term chips so users build spatial memory.

Aggregate event streams specifically need a timeline lane per aggregate root with causal arrows between events (CommandIssued → EventEmitted → PolicyTriggered). Render replay controls (play/pause/scrub) with a visible "as-of" cursor that dims future events, and expose a toggle between logical time (event sequence) and wall-clock time. For ubiquitous language glossaries, visualize term-to-term relationships (synonym, antonym, contextual-alias) as a force-directed graph where edges are labeled with the bounded context in which the relationship holds — the same word legitimately means different things in different contexts and the viz must surface that.

Cross-cutting: all three should share a URL-driven selection model (`?context=billing&aggregate=Invoice&event=3`) so deep links round-trip, and a "focus mode" that fades unrelated nodes to 20% opacity when inspecting a specific element.
