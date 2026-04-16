---
name: message-queue-implementation-pitfall
description: Common failure modes in message queue simulations including array mutation during iteration, unbounded growth, and timing-coupled rendering.
category: pitfall
tags:
  - message
  - auto-loop
---

# message-queue-implementation-pitfall

The most dangerous pitfall in array-based queue simulations is mutating the array while iterating over it. In the flow app, the particle cleanup loop uses `particles.splice(i, 1)` inside a `forEach`, which skips the element immediately after every splice because indices shift. Under normal conditions this merely shortens particle lifetimes by one frame, but under high-frequency consumption (rapid clicking) it can cause visible particles to vanish prematurely or leave ghost particles that never get cleaned up. The safe fix is to iterate in reverse (`for (let i = particles.length - 1; i >= 0; i--)`) or to filter-and-replace (`particles = particles.filter(p => p.life > 0)`).

Unbounded growth is another silent failure. The flow app caps the queue at 12 messages, but the dashboard's event log only trims when the DOM exceeds 40 children — there is no cap on the internal counters `totalIn` and `totalOut`, which will lose integer precision after ~9 quadrillion increments (not a practical concern, but symptomatic of the pattern). More critically, the dashboard `depths` array clamps values to 0–100 but the throughput delta is unclamped, meaning `totalOut` can exceed `totalIn` when the random subtraction (`delta - Math.floor(Math.random() * 5)`) is smaller than expected over long runs, causing the throughput percentage KPI to exceed 100%. In real queue monitors, this same class of bug appears when consumed-count telemetry arrives out of order or is double-counted after rebalance.

Timing coupling between simulation and rendering is a subtler issue. The dashboard drives all state mutations from `setInterval(tick, 1500)` — if the browser tab is backgrounded, modern browsers throttle `setInterval` to once per second or less, causing the simulation to slow down and the sparkline to stretch its time axis unpredictably. The dead-letter puzzle uses `setTimeout(render, 500)` after each answer, meaning rapid clicks during the 500ms transition can queue multiple `render` calls, spawning duplicate message cards. Decoupling the simulation clock from the render loop (e.g., using `requestAnimationFrame` for drawing and a separate monotonic timer for state) prevents both classes of timing bugs.
