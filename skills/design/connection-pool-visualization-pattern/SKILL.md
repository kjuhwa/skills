---
name: connection-pool-visualization-pattern
description: Three complementary visual metaphors for rendering connection pool state in real-time browser UIs.
category: design
triggers:
  - connection pool visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# connection-pool-visualization-pattern

Connection pool visualization works best when layered across three scales: macro (time-series), micro (individual node), and structural (lane/slot). The **time-series graph** (canvas-based) plots `active` connections over a sliding window (e.g., 80 ticks), with a dashed line at `MAX` capacity to show saturation proximity. The **node grid** (SVG circles) maps each physical connection to a positioned element whose fill, stroke, and label toggle between IDLE/BUSY states, with a pulse animation (`setInterval` toggling radius 32↔36) to make active connections visually scannable. The **lane view** (DOM divs with progress bars) assigns one horizontal lane per connection slot, showing remaining execution time as a shrinking bar (`width: remaining/total * 100%`) and surfacing the wait queue as a separate row of badges below.

The key reusable pattern is **state-to-visual mapping**: each connection object carries `{ active, remaining?, total? }` and a reference to its DOM/SVG element. On every tick, a single loop iterates the pool array, updates the element's class/attributes/text, and handles transitions (acquire → set BUSY style; release → reset to IDLE, drain the wait queue). Color conventions reinforce semantics: muted fill (`#1a1d27`) for idle, tinted fill with bright stroke (`#6ee7b7`) for active, and red-tinted dashed lines for capacity limits. Counters and logs are secondary readouts derived from the same pool state array, never from separate tracking variables—single source of truth prevents drift between visual and data.

Interactive controls (acquire/release buttons, pool-size slider, max-wait slider) mutate the shared pool model and the visualization reacts on the next tick. This decouples input handling from rendering: user actions and auto-simulation both call the same `acquire()`/`release()`/`newRequest()` functions, so the UI stays consistent regardless of trigger source.
