---
name: bulkhead-implementation-pitfall
description: Common failure modes when implementing bulkhead isolation — leak paths, sizing errors, and missing backpressure that silently defeat compartmentalization.
category: pitfall
tags:
  - bulkhead
  - auto-loop
---

# bulkhead-implementation-pitfall

The most dangerous bulkhead pitfall is **shared-resource leak paths** that bypass partition walls. In the thread-pool simulation, each service has an independent `max` and `active` counter — isolation works because no shared mutable state connects pools. In real systems, services often share a database connection pool, an HTTP client, or a memory heap. When the "bulkheaded" thread pools all contend on the same downstream bottleneck, a failure in one pool (e.g., slow queries from Payment Service) exhausts the shared resource and starves all pools equally. The bulkhead exists in name only. The fix is to audit every resource a pool touches and either dedicate it per-pool or apply independent limits at that layer too — bulkheads must be watertight at every shared boundary, not just at the thread-pool layer.

The second pitfall is **incorrect pool sizing and missing rejection handling**. The ship simulation shows this clearly: if walls divide the hull into grossly unequal sections, the largest section becomes the weak point. Translated to software: an oversized bulkhead pool (e.g., 200 threads for a service that needs 20) wastes resources and can mask latency issues, while an undersized pool rejects legitimate traffic prematurely. Worse, many implementations accept the bulkhead pattern but never wire up the rejection path — when the pool is full, the request blocks indefinitely instead of failing fast, converting a bulkhead into a deadlock. The monitor app's explicit `rejected` counter and the simulator's `REJECTED — bulkhead full` log model the mandatory fast-fail behavior. Every bulkhead must have a defined rejection policy (fail-fast, queue-with-timeout, or fallback), and that policy must be tested under load.

The third pitfall is **missing observability on compartment state**, which causes silent degradation. The simulator tracks fault status per partition; the monitor shows per-pool utilization percentage with an 85% degradation threshold (green->amber->red color ramp). Without these metrics, a half-failed bulkhead looks identical to a healthy system from outside. In production, teams deploy bulkheads but fail to alert on rejection rate, pool saturation, or queue depth — so when three of five pools are saturated, the only signal is a vague latency increase. The three-tier color system (green at <60%, amber at 60-85%, red at >85%) models the alerting thresholds that production bulkheads require: per-pool utilization and rejection rate must be instrumented, dashboarded, and alerted on, or the isolation guarantee is unverifiable.
