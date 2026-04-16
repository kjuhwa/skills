---
name: cqrs-visualization-pattern
description: Split-pane visualization separating command (write) and query (read) paths with a synchronized event bus in the middle
category: design
triggers:
  - cqrs visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# cqrs-visualization-pattern

CQRS visualizations should use a three-column layout that mirrors the architectural separation: commands on the left, an event/projection bus in the middle, and queries on the right. Commands flow left-to-right as discrete boxes (CreateOrder, UpdateInventory, CancelOrder) into a write-model aggregate, which emits domain events downward onto the bus. The bus fans out to one or more read-model projections (OrderSummaryView, InventoryCountView), each rendered as its own denormalized table or card so viewers see why projections are purpose-built rather than normalized. Queries enter from the right and resolve instantly against these views, highlighting the asymmetry that makes CQRS valuable.

Use motion and color to reinforce the divide: commands animate with a "request→validate→persist→emit" multi-stage path in one hue (e.g., orange for writes), while queries animate as a single fast lookup in a contrasting hue (e.g., blue for reads). Events on the bus need a third color and carry a visible sequence number so users can trace causality from command to projection update. Always show eventual consistency explicitly — a lag indicator (ms or event count) between event emission and projection apply is the single most educational element, because it's the property newcomers most often miss.

Include a toggle to collapse one side at a time. Letting the user hide the read side shows "pure command sourcing" feel; hiding the write side shows "pure materialized views." This teaches that CQRS is a dial, not a binary choice, and prevents the common misreading that CQRS requires event sourcing.
