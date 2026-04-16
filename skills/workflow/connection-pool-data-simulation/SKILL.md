---
name: connection-pool-data-simulation
description: Simulate connection-pool acquire/release cycles with probabilistic request arrival, TTL-based slot release, and pending-queue drain logic.
category: workflow
triggers:
  - connection pool data simulation
tags:
  - auto-loop
version: 1.0.0
---

# connection-pool-data-simulation

The simulation engine across all three apps follows a common tick loop: each interval, probabilistically generate incoming requests (monitor: `Math.random() < 0.4`, bubbles: `Math.random() < 0.3`, tuner: `Math.random() < reqRate/20`), attempt to acquire a free slot via `slots.find(s => !s.busy)`, and if none is available, increment a pending queue counter or push a queue object. Acquired slots get a randomized TTL (`30 + Math.random() * 120` ticks in the monitor, `80 + Math.random() * 200` frames in bubbles, `queryTime * (0.5 + Math.random())` ms in the tuner). Each tick decrements the TTL; when it hits zero, the slot is released. Critically, the release path immediately checks the pending queue and re-acquires the slot if waiters exist — this models connection hand-off without returning to idle, matching real pool behavior (HikariCP's `handoffQueue`).

The tuner app adds a parameterized dimension: pool size, request rate, and average query time are exposed as range sliders that rebuild the slot array and reset history on change. This creates an interactive feedback loop where users can observe that doubling pool size halves latency only up to a saturation point, or that increasing query time degrades utilization non-linearly. The derived latency formula `queryTime + pendingQueue * 80 + jitter` when the queue is non-empty versus `queryTime * (0.3 + random * 0.7)` when idle approximates Little's Law behavior without requiring full queueing-theory math. This is the key reusable formula for any pool simulation that needs believable latency curves.

Tick intervals vary by purpose: the monitor uses 300ms (dashboard cadence, readable log entries), bubbles uses `requestAnimationFrame` (~16ms, smooth orbital animation), and the tuner uses 50ms (responsive slider feedback). When extracting this pattern, match tick rate to visual fidelity requirements. For dashboards, 200-500ms ticks with `setInterval` suffice. For physics-style animations, use `requestAnimationFrame` with delta-time accumulation. Always cap history arrays to prevent memory growth — 60 samples is the consensus across all three apps, representing roughly 18 seconds at 300ms or 3 seconds at 50ms.
