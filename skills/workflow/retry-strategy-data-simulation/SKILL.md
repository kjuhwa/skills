---
name: retry-strategy-data-simulation
description: Client-side retry simulation engine using configurable delay functions, probabilistic failure models, and budget-windowed rate limiting.
category: workflow
triggers:
  - retry strategy data simulation
tags:
  - auto-loop
version: 1.0.0
---

# retry-strategy-data-simulation

The retry simulation engine is built around three composable pieces: a **delay calculator** that is a pure function mapping `(strategy, attemptIndex) → milliseconds` — fixed returns a constant (500ms), linear scales as `baseDelay × attempt` (300ms × n), and exponential uses `min(baseDelay × 2^attempt, cap)` with an optional jitter multiplier of `(0.5 + random × 0.5)` applied post-exponentiation. The **trial loop** runs `while(attempts <= maxRetries)` with `Math.random() > failureRate` as the success predicate, accumulating `totalDelay` from the delay function on each failure. This deterministic-random model lets the simulator batch 20 independent trials per run (simulator), use a shared `succeedAt` threshold across lanes (timeline racer), or run continuously with `setTimeout(tick, 600 + random * 800)` for live streaming (budget dashboard).

The **budget-window pattern** in the playground introduces a production-realistic constraint: a global counter `budgetUsed` increments on every retry across all endpoints, visualized as a circular gauge. When the budget hits `BUDGET_MAX` (50), it resets to 20% (`Math.floor(BUDGET_MAX * 0.2)`), simulating a sliding-window retry budget that prevents thundering-herd cascades. The attempt distribution is tracked in a fixed-size array `dist = new Array(7).fill(0)` where `dist[0]` counts first-try successes and `dist[1..6]` count retries, rendered as a histogram. The live log maintains a capped FIFO (`unshift` + `pop` at 30 entries) with endpoint name, attempt count, success/fail status, and timestamp.

For reuse, the critical pattern is: keep the delay function stateless and injectable, run the simulation loop synchronously for batch mode or with `setTimeout` recursion for streaming mode, and separate the success predicate (here `Math.random() > rate`, but in production this would be an actual HTTP call). The budget counter is a cross-cutting concern that wraps the per-request loop — increment on each retry globally, and implement a reset policy (percentage-based window reset, time-based decay, or token-bucket refill) to prevent retry amplification storms across concurrent callers.
