---
name: rebalance-partition-ownership-swimlane
description: Render partition-to-consumer assignment as horizontal swimlanes with animated handoff arcs during rebalance events.
category: frontend
triggers:
  - rebalance partition ownership swimlane
tags:
  - auto-loop
version: 1.0.0
---

# rebalance-partition-ownership-swimlane

Consumer group rebalances are notoriously hard to reason about because partition ownership changes atomically across many consumers at once. A reusable visualization pattern: render each partition as a horizontal lane spanning the time axis, colored by its current owner (consumer instance). At rebalance events, draw a Bezier arc from the old owner's color-band to the new owner's color-band, with the arc's vertical span equal to the lane's Y offset delta. The arc animates in over the rebalance duration (stop-the-world gap), so the user literally sees ownership "flying" between consumers.

Data model: `partitions[]` each hold an array of `{t, ownerId}` transitions. At render, for each transition compute `arc = { x: t, y1: laneY, colorFrom: prevOwnerColor, colorTo: newOwnerColor }` and draw via SVG path `M x,y1 C x+30,y1 x+30,y1 x+60,y1` with a gradient stop at 50%. During the rebalance window (between `RebalanceStart` and `RebalanceEnd` events), dim all lanes to 0.3 opacity and render a full-height vertical band in amber — this makes "everyone is paused" visible without a separate legend.

The pattern generalizes to any ownership-transfer system: shard migration, leader election, lock handoff, task stealing in work-queues. The swimlane-plus-handoff-arc is load-bearing because it separates *who owned what when* from *when the transition happened*, which a state-over-time heatmap conflates. Keep the arc duration proportional to the actual stop-the-world gap, not a fixed animation — that's what turns the viz from decorative into diagnostic.
