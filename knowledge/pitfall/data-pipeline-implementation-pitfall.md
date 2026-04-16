---
name: data-pipeline-implementation-pitfall
description: Common failure modes when building data pipeline visualizations — particle leaks, DAG cycle corruption, and metric drift.
category: pitfall
tags:
  - data
  - auto-loop
---

# data-pipeline-implementation-pitfall

The most insidious bug in particle-based pipeline monitors is memory leaks from un-reaped records. The flow monitor filters dead particles on two conditions (`dead && color !== fail_color` OR `elapsed > 300`), but this means failed-record particles linger until their timer expires. Under sustained high error rates (>20%), the particle array grows unbounded because failed particles accumulate faster than they age out. The fix is to always cap the particle pool with a hard maximum (e.g., 500) and evict oldest-dead-first, rather than relying solely on time-based expiry. A secondary issue: the `stage === failAt` check happens only when a particle snaps to a stage boundary (`Math.abs < 3`), so if the easing factor is too low and the particle never reaches the snap threshold, it becomes an immortal ghost drifting forever — always test with extreme easing values.

The DAG builder has no cycle detection. Double-clicking two nodes in reverse order silently creates a backward edge, turning the DAG into a cyclic graph. When "Run Pipeline" fires, the sequential edge activation still completes (it iterates the flat edge array, not a topological sort), masking the corruption. In a real system this would cause infinite loops or deadlocks. Any pipeline DAG editor must validate acyclicity on every edge insertion — a simple DFS from the target node checking reachability of the source is O(V+E) and prevents the entire class of bugs. Additionally, the edge model stores pairs of node IDs but never cleans up dangling edges when a node is deleted (deletion isn't implemented yet, which itself is a gap), so extending the builder requires an edge-pruning pass on node removal.

The throughput dashboard generates each metric independently with `Math.random()`, which means error rate can read 0% while backpressure shows 40% — a state that is physically impossible in a real pipeline (backpressure without errors implies the pipeline is slowing down, not failing). Consumers of the dashboard will internalize these uncorrelated patterns as normal, then miss real anomalies in production where the metrics should co-move. The simulation should enforce at least soft coupling: when backpressure exceeds a threshold, nudge error rate upward and throughput downward, preserving the causal relationships operators need to learn.
