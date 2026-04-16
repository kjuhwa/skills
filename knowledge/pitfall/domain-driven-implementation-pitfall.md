---
name: domain-driven-implementation-pitfall
description: Common mistakes when building interactive DDD modeling tools — data coupling, missing invariants, and render bottlenecks
category: pitfall
tags:
  - domain
  - auto-loop
---

# domain-driven-implementation-pitfall

The most dangerous pitfall across all three apps is **full-scene redraw on every mouse move**. The context map calls `render()` (which clears and rebuilds the entire SVG DOM) on every `mousemove` during drag. The aggregate explorer repaints the full Canvas on every resize. At small scale (6 contexts, 4 aggregates) this is invisible, but with 30+ bounded contexts or 100+ event storm notes, the approach collapses — SVG DOM thrashing causes visible jank, and Canvas `clearRect` + full repaint at 60fps becomes CPU-bound. The fix is dirty-flag rendering: track which element moved, update only its coordinates (SVG `setAttribute` on the moved node) or use Canvas layering (static layer + drag layer), and skip full redraws when nothing changed.

The second pitfall is **missing relationship semantics in the data model**. The context map assigns relationship types (ACL, Shared Kernel, etc.) but stores them only as display labels — there is no behavioral difference between a "Partnership" and a "Conformist" line beyond color. In a real DDD tool, the relationship type should constrain what operations are valid: an Anti-Corruption Layer implies a translation layer exists, a Conformist means the downstream context has no translation, a Shared Kernel means both contexts share a module. Without enforcing these semantics, users can draw architecturally contradictory maps (e.g., a bidirectional ACL, or a Shared Kernel between contexts that share nothing) and the tool won't flag the inconsistency. The event storm has the same issue — policies reference events and commands by text string with no validation that the referenced event actually exists or that the command belongs to the correct aggregate.

The third pitfall is **aggregate boundaries that are too large or have no invariants**. The aggregate explorer allows aggregates with many entities but only 1-2 invariants, which in practice signals an anemic aggregate — a cluster of entities that aren't really protecting a business rule together. The tool should warn when an aggregate has zero invariants or when an entity doesn't participate in any invariant. Similarly, value objects like "OrderStatus" in the Order aggregate are arguably entities if they have lifecycle transitions, and the tool doesn't help the user distinguish. For event storming, a common mistake is creating "phantom aggregates" — aggregate sticky notes that don't appear as the target of any command, making them orphaned concepts on the board that confuse rather than clarify the model.
