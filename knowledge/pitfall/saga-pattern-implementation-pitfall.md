---
name: saga-pattern-implementation-pitfall
description: Common mistakes when building saga orchestration simulations and visualizations that silently misrepresent real distributed transaction behavior.
category: pitfall
tags:
  - saga
  - auto-loop
---

# saga-pattern-implementation-pitfall

The most dangerous pitfall across all three apps is that `setTimeout`-based sequential execution masks the concurrency hazards present in real sagas. In production, a compensation step can fail independently (the refund service is down), requiring retry logic or a dead-letter mechanism for "stuck compensations." None of the three apps model compensation failure — once the LIFO loop begins, every compensation is assumed to succeed. This creates a false mental model where rollback is always clean and instant. A realistic simulation should introduce a `compensationFailRate` parameter and show what happens when a compensation step itself fails mid-chain: the saga enters a "partially compensated" state that requires manual intervention or a secondary retry policy.

A second pitfall is the tight coupling between step definition and execution order. All three apps use a hardcoded `steps[]` array where the index determines execution sequence. Real saga orchestrators use a DAG or state machine where steps can branch, run in parallel, or have conditional guards. The linear array model cannot represent "charge payment AND reserve inventory in parallel, then ship" — a common real-world pattern. When users internalize the linear model from these simulations, they design production sagas that serialize unnecessarily, increasing end-to-end latency. The timeline app partially addresses this by allowing steps to target different service lanes at the same time offset, but the orchestrator and simulator enforce strict sequential ordering.

Third, the `failAt` randomization always targets indices 1–3, never index 0. This means the "Create Order" step can never fail in simulation, which hides a critical real-world edge case: what happens when the very first saga step fails before any state is committed? The correct answer is "nothing to compensate, just report failure," but users who never see this case may add unnecessary compensation logic for the initiating step. Additionally, none of the apps persist saga state — a browser refresh loses all progress. Real orchestrators must durably log each step transition so that after a crash, recovery can resume compensation from the last known state rather than restarting from scratch.
