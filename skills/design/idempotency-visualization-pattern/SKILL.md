---
name: idempotency-visualization-pattern
description: Reusable visual encoding patterns for rendering idempotency key lifecycle, deduplication flows, and at-most-once delivery guarantees in canvas/SVG dashboards.
category: design
triggers:
  - idempotency visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# idempotency-visualization-pattern

The core visual metaphor maps each incoming request to a particle that carries a visible idempotency key (truncated hash). Duplicate requests share the same color and shape, making collisions immediately obvious. A three-lane layout separates the flow into **Ingress** (incoming requests with keys), **Dedup Gate** (key lookup + match detection), and **Execution** (the single accepted request proceeding to side-effect). Duplicate particles bounce off the gate with a red flash and redirect into a "cached response" return lane, while first-seen keys pass through with a green glow and register in a key-store ring rendered as a TTL-aware circular buffer where slots visibly decay over time.

For the key vault visualization, render the store as a hash-ring or grid of cells, each cell sized proportionally to its remaining TTL. Expiring keys fade from accent green to dim gray; collisions cause a brief pulse on the matching cell. A secondary "proof canvas" overlay draws causal arrows between the original request and all subsequent duplicates, forming a deduplication DAG that makes the at-most-once guarantee visually provable. Each arrow is annotated with the time delta, highlighting how close retries arrived and whether they fell within or outside the idempotency window.

The battle mode visualization pits concurrent request streams against a shared idempotency gate, rendering each stream as a colored column of particles. The gate's throughput is shown as a single-lane bottleneck with a lock icon that flashes on contention. Successfully deduplicated bursts collapse into a single output particle labeled with the response, while race-condition failures (when keys expire mid-retry) are shown as red particles escaping through the gate — a visual debugging tool for tuning TTL and concurrency parameters.
