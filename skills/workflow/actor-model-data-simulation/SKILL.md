---
name: actor-model-data-simulation
description: Generate realistic actor workloads with crashes, backpressure, and supervision restarts for demos
category: workflow
triggers:
  - actor model data simulation
tags:
  - auto-loop
version: 1.0.0
---

# actor-model-data-simulation

Seed simulations with a small cast of archetypal actors rather than random ones: a `Producer` that emits messages at a configurable Poisson rate, a `Worker` pool behind a `Router` actor, a `FlakyService` that crashes with probability `p` on each message, and a `SlowConsumer` whose processing time is sampled from a log-normal distribution. This handful reproduces the interesting phenomena — backpressure, restart storms, head-of-line blocking, supervisor escalation — without needing a large synthetic graph. Parameterize rates, crash probability, and mailbox bound as sliders so users can drive the system into each regime live.

Drive the simulation from a single logical clock with deterministic seeding. Every actor action (send, receive, crash, restart) is scheduled on a priority queue keyed by virtual time, and the RNG is seeded per-run so a given seed reproduces the exact message interleaving. This is what makes actor demos trustworthy — users who pause on a crash can step forward one message at a time and see the supervisor's decision tree (`:restart` / `:stop` / `:escalate`) apply deterministically. Emit events to the same log the visualization consumes so sim and UI share one source of truth.

For the chat-REPL variant, treat each REPL session as an actor with its own mailbox and let users type `spawn`, `send <pid> <msg>`, `kill <pid>`, and `tree` as commands. Back the REPL with the same simulation engine; the REPL is just another event producer. Pre-canned scripts (`demo:restart-storm`, `demo:backpressure`, `demo:escalation`) should seed the RNG and replay a known scenario so onboarding users hit the interesting failure modes within the first minute.
