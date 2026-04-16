---
name: pub-sub-data-simulation
description: Generate realistic pub-sub traffic with topic hierarchies, bursty publishers, and heterogeneous subscriber latencies
category: workflow
triggers:
  - pub sub data simulation
tags:
  - auto-loop
version: 1.0.0
---

# pub-sub-data-simulation

Seed the simulation with a topic tree (e.g., `news.*`, `news.sports.*`, `news.weather.eu`) and define 3–5 publishers, each bound to a primary topic with a small chance of cross-publishing. Drive publish events from a Poisson process with λ that varies per topic — breaking-news topics get bursty λ (spikes of 5–10 msgs/sec), while weather/traffic topics get steady λ≈0.5/sec. This mix exercises both fan-out scalability and slow-consumer scenarios in the same run.

Subscribers should be generated with heterogeneous profiles: fast (≤10ms processing), slow (100–500ms), and flaky (5% drop rate, occasional 2s stalls). Bind each subscriber to 1–3 topics using wildcard patterns so the broker's topic-matching logic gets real exercise. Maintain a per-subscriber inbox queue with a bounded capacity (e.g., 50) — when full, apply the configured overflow policy (drop-oldest, drop-newest, or block-publisher) and emit a visible overflow event to the viz layer.

Record every publish/deliver/drop as a structured event `{t, topic, publisherId, subscriberId, status}` so the visualization can replay deterministically and so metrics (delivery rate, p99 latency, drop count per topic) can be computed. For pub-sub-radio-tower specifically, add a "tune" action that dynamically rebinds a subscriber mid-stream to demonstrate late-join semantics and whether the broker replays retained messages.
