---
name: command-query-visualization-pattern
description: Dual-lane visual layout that spatially separates commands (mutations) from queries (reads) using color-coded channels and directional flow.
category: design
triggers:
  - command query visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# command-query-visualization-pattern

Command-query visualizations rely on a consistent dual-lane metaphor where commands and queries occupy distinct visual regions. The timeline app places commands above a center axis and queries below it, using vertical bar height to encode duration. The bus simulator renders two parallel SVG bus lines (top for commands, bottom for queries) with animated particles flowing left-to-right to show dispatch. The CQS analyzer uses left-border color coding on method cards. All three apps converge on the same color convention: red (#f87171) for commands (state-mutating operations) and blue (#60a5fa) for queries (data-returning operations), with green (#6ee7b7) reserved for neutral UI chrome like headings and primary action buttons.

The reusable pattern is a three-part structure: (1) an input zone where the user triggers or defines operations, (2) a visualization zone that renders commands and queries in spatially or chromatically separated lanes, and (3) a stats/log zone that summarizes the command-to-query ratio or lists handler outcomes. Canvas works well for timeline-style aggregate views where you need many items at once, SVG suits animated flow diagrams with individual particle motion, and DOM cards are best for detailed per-method inspection. The key design constraint is that the two operation types must never share a visual lane — spatial separation is what makes the CQ concept tangible to users.

A dark background (#0f1117) with muted panel surfaces (#1a1d27) provides the contrast needed for the red/blue duality to read clearly. Interactive controls should be minimal: a type selector (command vs. query), a name input, and a dispatch/analyze trigger. Violation states (operations that both mutate and return) introduce a third color — amber (#fbbf24) — but only in the analyzer context, not in flow visualizations where operations are assumed to be properly separated.
