---

name: backpressure-data-simulation
description: Token-stepped discrete event loop driving producer/buffer/consumer with per-tick rate budgets
category: workflow
triggers:
  - backpressure data simulation
tags: [workflow, backpressure, data, simulation]
version: 1.0.0
---

# backpressure-data-simulation

Model the pipeline as three actors (producer, bounded buffer, consumer) advanced by a fixed tick (e.g., 50ms). Each tick, producer computes `itemsToEmit = producerRate * dt + carryover` using fractional carryover to support sub-tick rates accurately; consumer similarly drains `consumerRate * dt` items. The buffer enforces policy at enqueue: if `size >= highWatermark`, emit a PAUSE signal to producer; on dequeue below `lowWatermark`, emit RESUME. Each item carries `{id, producedAt, enqueuedAt, dequeuedAt}` so the UI can compute end-to-end latency and queue dwell time per item, which is the real metric users care about.

Separate the **simulation clock** from wall-clock rendering. Run the sim in a tight loop (requestAnimationFrame or setInterval at 50ms) but allow a speed multiplier (0.25x–5x) so slow phenomena (TCP slow-start ramp, credit exhaustion recovery) can be sped up and fast ones (buffer overflow cascade) can be slowed. Maintain a ring buffer of the last N ticks of metrics (rate, fill, drops) for the live chart — don't accumulate unbounded history in the sim state.

For strategy comparison (as in reactive-stream-juggler), run parallel sim instances with identical producer input but different buffer policies; synchronize their clocks and render side-by-side. For window-based sims (tcp-window-sim), model the window as `inFlight <= cwnd` and trigger RTT-delayed ACK events via a scheduled-event queue rather than per-tick polling — otherwise ACK timing is quantized to tick boundaries and slow-start curves look wrong.
