---
version: 0.1.0-draft
name: bulkhead-implementation-pitfall
description: Common mistakes that silently defeat bulkhead isolation in visualizations and real systems
category: pitfall
tags:
  - bulkhead
  - auto-loop
---

# bulkhead-implementation-pitfall

The most common pitfall is sharing an underlying resource across supposedly-isolated bulkheads — for example, using `setTimeout` callbacks that all hit the same JS event loop, or in production, thread pools that share a database connection pool underneath. If your "isolated" pools all enqueue to one downstream queue, you've built a façade, not a bulkhead. Always verify that the simulated bottleneck (CPU, connection, lock) is actually partitioned per bulkhead in the model, not just the accounting layer.

A second trap is sizing all bulkheads identically "for symmetry." Real bulkhead deployments deliberately size partitions asymmetrically based on traffic class priority — the critical-path partition gets more slots than the batch partition. Visualizations that show equal-sized chambers miss this design lever entirely. Include at least one demo scenario where the critical partition is given 70% of total capacity and a low-priority partition gets 30%, so the tradeoff becomes concrete.

Third, rejected requests are frequently rendered as "disappeared" rather than explicitly shown. This hides the cost of the pattern: bulkheads trade availability for isolation, and users must see the rejection pile growing to understand that tradeoff. Always surface a rejection counter and ideally an animation of requests bouncing off a full chamber. Relatedly, don't let queued requests accumulate unboundedly in the simulation — real bulkheads have bounded queues, and an unbounded visualization queue masks the back-pressure behavior that makes the pattern valuable.
