---
name: actor-model-data-simulation
description: Generate synthetic actor system events—message passing, mailbox queuing, and crash/restart cascades—using timer-driven stochastic injection.
category: workflow
triggers:
  - actor model data simulation
tags:
  - auto-loop
version: 1.0.0
---

# actor-model-data-simulation

Actor-model simulations require three independent data generators that mirror the core abstractions: **message routing**, **mailbox queuing**, and **supervision lifecycle**. Message routing picks a random sender and a distinct random receiver from the actor pool, attaches a typed label from a domain-specific vocabulary (`['compute', 'io-read', 'io-write', 'validate', 'transform', 'notify', 'checkpoint']`), and pushes a message object with interpolation parameter `t=0`. The key design choice is that messages are stateful objects living in a shared array, advanced each frame (`t += step`), and spliced on arrival—this makes the message pool self-cleaning without a GC pass. Broadcast is a special case: iterate `actors.slice(1)` from a designated supervisor, creating N-1 simultaneous messages. Background injection via `setInterval` (800–1200ms) with a coin-flip gate (`Math.random() > 0.5`) keeps traffic stochastic rather than deterministic, preventing artificial regularity.

**Mailbox simulation** assigns each actor a random processing speed (`500 + Math.random() * 1500`) and a bounded queue (cap at 8 entries to model backpressure). The `tick()` loop is self-scheduling: if a message is available and nothing is processing, shift from the queue, set `this.processing`, and `setTimeout` for the actor's speed; otherwise re-check in 200ms. This creates naturally varying throughput across actors without a central scheduler. A global `paused` flag freezes all ticks, simulating system-wide stop-the-world events. **Crash cascades** use a tree adjacency structure: `crash(id)` sets the target to `crashed`, then `children(id).forEach(c => state[c] = 'crashed')` propagates downward. The supervisor response is a two-phase delayed recovery—first phase (1000ms) sets states to `restarting`, second phase (800ms) restores to `alive`—modeling the real-world supervisor restart strategy where child actors are stopped, the failed actor is reinitialized, and children are re-spawned in sequence.
