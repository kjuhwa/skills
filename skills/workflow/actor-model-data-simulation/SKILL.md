---
name: actor-model-data-simulation
description: Driving actor message flow with requestAnimationFrame, per-tick probabilities, and mailbox FIFOs
category: workflow
triggers:
  - actor model data simulation
tags:
  - auto-loop
version: 1.0.0
---

# actor-model-data-simulation

Model each actor as `{ mailbox: [], state, processed, peer }` and advance simulation inside `requestAnimationFrame` using `dt = min(50, now - last)` to cap physics steps. Message processing is probabilistic per tick — `if (mailbox.length > 0 && Math.random() < 0.05 * (speed/5))` shifts one envelope, increments `processed`, flips `state='busy'` with a 300ms `setTimeout` reset, and optionally replies to a random peer with probability 0.4. Auto-traffic injection uses a second per-frame roll like `Math.random() < 0.02 * speed/5` to send between random pairs, preventing the simulation from going idle.

For request/reply pairs (ping-pong), bake the next message name into the handler: `const next = this.name === 'Pinger' ? 'pong' : 'ping'` and re-send via `setTimeout(() => send(this, this.peer, next + '#' + n), 200)` only while a `running` flag is true. Latency and drop rate are driven by range inputs: compute `drop = dropInp.value / 100` at send time and mark `dropped: true` on the in-flight envelope so the renderer colors it red and skips the `receive()` call on arrival. For supervision, crashes are async two-phase: set `status='crashed'` immediately, `setTimeout(applyStrategy, 600)`, then `status='restarting'` → `setTimeout(() => status='alive'; restarts++, 700)` to visualize the lifecycle.
