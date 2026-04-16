---
name: retry-strategy-visualization-pattern
description: Dark-themed multi-view retry visualization using Canvas/SVG with color-coded success/failure states and animated timeline racing.
category: design
triggers:
  - retry strategy visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# retry-strategy-visualization-pattern

Retry strategy visualizations follow a three-view architecture: (1) a **bar-chart simulator** using Canvas that batches N concurrent requests against a configurable failure rate and renders per-request bars color-coded green (`#6ee7b7`) for success and red (`#f87171`) for failure, with attempt-count labels above each bar and aggregate statistics (success rate, average delay, average attempts) in a summary panel below; (2) an **animated timeline racer** that pits multiple strategies (Fixed, Exponential, Jittered Exponential) on the same deterministic failure sequence (`succeedAt = 2 + random(4)`), rendering expanding DOM blocks for each attempt (fail/success/wait) with CSS `transition: width 0.3s` and staggered `setTimeout` cascades to create a race effect; (3) a **budget dashboard** combining an SVG circular progress ring (stroke-dasharray driven by `budgetUsed/BUDGET_MAX`) that shifts from green to red above 80% threshold, a live scrolling request log capped at 30 entries, and a Canvas histogram showing attempt-count distribution.

All three views share a consistent dark palette (`#0f1117` background, `#1a1d27` card surfaces, `#2d333b` borders, `#8b949e` muted text) with `#6ee7b7` as the primary accent for success and headings, `#f87171` for failures, and `#3b82f6` for neutral histogram bars. Cards use `border-radius: 10px` and no borders, relying on background contrast. The controls pattern is a horizontal flex row of `<select>`, `<input type="range">`, and `<input type="number">` elements styled inline with the dark theme, plus a single prominent green action button. Canvas charts always draw onto a `#2d333b` filled background with `roundRect` bars, 11px sans-serif labels, and `#8b949e` axis text — no grid lines, no external charting library.

The key reusable insight is separating the **delay function** (pure: `(strategy, attempt) → ms`) from the **simulation loop** (drives attempts with `Math.random() > failRate` success checks) from the **rendering layer** (Canvas bars, DOM timeline blocks, or SVG rings). Each app plugs different renderers into the same core retry-simulate pattern. The timeline racer demonstrates that animated block expansion with `setTimeout` chaining (300ms per step) and per-lane stagger (`si * 200ms`) creates a compelling comparison without any animation library.
