---
name: command-query-implementation-pitfall
description: Three critical failure modes in command-query separation: false-negative classification, unrealistic latency simulation, and unbounded resource growth.
category: pitfall
tags:
  - command
  - auto-loop
---

# command-query-implementation-pitfall

**False-negative classification** is the most subtle pitfall. The prefix-based classifier in the separator app will misclassify non-standard verb commands as queries. Operations like `cancelOrder`, `revertPayment`, `approveRequest`, or `archiveDocument` use verbs not in the 13-prefix command list and fall through to the default query classification. In production CQ systems this means a state-mutating operation gets routed to the query path — potentially hitting a read replica, bypassing write validation, or skipping event emission. The mitigation is a deny-list of known action verbs combined with a "when in doubt, classify as command" default (fail toward the stricter path), or better yet, explicit annotation at the call site rather than relying on naming conventions alone.

**Fixed-delay timing models** create a false sense of correctness. The monitor app simulates command latency as `20 + random * 80` ms and query latency as `5 + random * 30` ms — uniform distributions with no tail. Real CQ systems exhibit long-tail latencies on commands (write contention, lock escalation, event fan-out) and occasional query spikes (cache miss, cold read replica). A simulation that only uses uniform random latency will never surface timing-dependent bugs like read-after-write inconsistency, stale projection reads, or command timeout cascading into query retries. Realistic simulation needs at minimum a bimodal distribution (fast path + occasional spike) and should inject correlated slowdowns where a burst of commands degrades query latency through shared resource contention.

**Unbounded resource growth** silently degrades long-running dashboards. The pipeline app filters completed packets (`progress > 1.05`) every animation frame but never throttles the spawn rate — a rapid user clicking "Send Command" can grow the active packet array faster than particles complete traversal, causing frame drops. The monitor caps the feed at 50 DOM nodes and the latency buffer at 100 entries, but the SVG chart rebuilds its entire innerHTML on every event (every 300ms), which triggers layout thrashing. The fix is to separate the data-update frequency from the render frequency using a dirty flag or `requestAnimationFrame` guard, and to use DOM diffing or pooled SVG elements rather than full innerHTML replacement for the chart.
