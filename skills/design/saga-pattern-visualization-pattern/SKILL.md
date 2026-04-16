---
name: saga-pattern-visualization-pattern
description: Three complementary visual encodings for saga orchestration: step-card pipeline, canvas Gantt timeline, and interactive node-graph simulator.
category: design
triggers:
  - saga pattern visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# saga-pattern-visualization-pattern

All three saga apps share a consistent four-state color language that maps directly to saga transaction phases: forward/executing (#facc15 yellow), completed (#6ee7b7 green), failed (#f87171 red), and compensating (#a78bfa purple). This palette is not arbitrary — it encodes the saga state machine itself. Each visual element (card border-left color, canvas block fill, SVG node border/glow) transitions through these four states in sequence, giving the viewer an immediate read on where the saga is in its lifecycle. Apply this by defining a `SAGA_STATES` constant mapping `{running, done, failed, compensated}` to these colors and reusing it across all rendering layers.

The orchestrator (app 100) uses a vertical step-card layout where each saga step is a row with icon, name, progress bar, and status label. State changes are applied via CSS class swaps (`.step.running`, `.step.done`, `.step.failed`, `.step.compensated`), making the DOM the single source of visual truth. The timeline (app 101) projects the same saga data onto a canvas-based Gantt chart with service lanes on the Y-axis and time on the X-axis, rendering blocks with `roundRect` and a hit-test array for hover tooltips. The simulator (app 102) uses an SVG node graph with toggle switches for fault injection, combining a grid of interactive node cards with a horizontal SVG flow line that changes stroke color during compensation. The reusable pattern is: pick card-list for step-by-step orchestration views, canvas-Gantt for multi-saga temporal comparison, and SVG-node-graph for interactive what-if simulation.

A shared structural pattern across all three is the separation of data model from render loop. Each app defines saga steps as a static array of `{name, comp}` pairs (forward action + compensation action), then a `render()`/`draw()`/`buildUI()` function that projects this array into the DOM/canvas/SVG. State mutation happens in the async `runSaga()`/`run()` function, which walks the step array forward, and on failure reverses through a `completed[]` stack calling compensation in LIFO order. This separation means the visualization layer can be swapped without touching the saga execution logic.
