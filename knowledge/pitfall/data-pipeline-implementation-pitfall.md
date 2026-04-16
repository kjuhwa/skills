---
name: data-pipeline-implementation-pitfall
description: Common failure modes in pipeline visualization apps: missing topological sort, unbounded throughput drift, no backpressure, and SVG memory leaks during drag operations.
category: pitfall
tags:
  - data
  - auto-loop
---

# data-pipeline-implementation-pitfall

The most dangerous pitfall in pipeline DAG visualization is skipping topological sort for execution ordering. A naive approach—extracting nodes from the edges array via `[...new Set(edges.flatMap(e=>[e.from,e.to]))]`—preserves insertion order rather than dependency order, producing incorrect execution sequences for any DAG more complex than a linear chain. Combined with the absence of cycle detection, users can create A→B→A loops that the execution engine blindly follows. The fix requires implementing Kahn's algorithm or DFS-based topological sort, and rejecting edge additions that would create cycles by checking reachability from the target node back to the source before inserting the edge.

Throughput simulation has a subtle clipping bug: when the Y-axis is hardcoded to a fixed max (e.g., 1000 rec/s) but the random-walk model has no upper bound, values inevitably drift above the chart ceiling. The formula `y = padTop + height - value/1000 * height` produces negative y-coordinates for values >1000, rendering data points above the visible canvas area with no visual indication that the chart is saturated. The sidebar percentage bar masks this with Math.min(100, value/10), silently capping at 100%. The fix is either dynamic Y-axis scaling (track max across all series and recalculate grid) or clamping the random walk with Math.min(maxValue, newValue).

SVG-based interactive DAG editors suffer from performance degradation during drag operations because `redrawEdges()` removes and recreates all SVG line elements on every mousemove event. For graphs with >30 edges, this causes visible jank. The mitigation is to update existing line coordinates in-place (setAttribute on x1/y1/x2/y2) rather than destroying and rebuilding DOM nodes. Similarly, flow monitor animations must use reverse iteration (`for(let i=dots.length-1;i>=0;i--)`) when splicing completed records from the array mid-loop to avoid skipping elements—a bug that manifests as records "teleporting" past stages. Finally, no backpressure mechanism exists: the fixed spawn probability (15% per frame) continues generating records regardless of queue depth, which in sustained runs causes the dots array to grow unbounded, degrading animation frame rate.
