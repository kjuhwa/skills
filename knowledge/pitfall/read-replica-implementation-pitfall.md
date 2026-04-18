---
version: 0.1.0-draft
name: read-replica-implementation-pitfall
description: Common mistakes when modeling read-replica lag, routing, and consistency guarantees in a simulator
category: pitfall
tags:
  - read
  - auto-loop
---

# read-replica-implementation-pitfall

The most frequent pitfall is treating replication lag as a scalar delay applied uniformly to all reads. Real replicas lag per-LSN, not per-wall-clock: if the primary commits LSN 100 at t=0 and the replica is at LSN 95, a read arriving at t=50ms sees LSN 95 regardless of how much wall-clock time passed. Simulators that just `setTimeout(read, lagMs)` produce plausible-looking but incorrect behavior — they can't reproduce read-your-writes violations correctly because the violation depends on LSN ordering, not timing. Always model `appliedLsn` explicitly on each replica and resolve reads against the snapshot at that LSN.

A second trap is the **round-robin fairness illusion**: naive routing that cycles through replicas appears balanced but ignores that a lagging replica serving stale reads is worse than no replica at all. Production routers use least-lag or weighted-random with lag as a negative weight, and crucially they exclude replicas whose lag exceeds a threshold (typically 1–5 seconds). Simulators that skip this exclusion make it look like more replicas always improve throughput, masking the real operational truth that an unhealthy replica must be taken out of rotation. Also, "least-lag" without hysteresis causes thrashing — add a dwell time (e.g., 500ms) before switching targets.

The third pitfall is conflating **replication lag** with **read staleness bound**. An async replica with 10ms lag can still serve a read that is 10 minutes stale if the key hasn't been written to in 10 minutes — staleness is a per-key property, not a per-replica one. For the consistency simulator, track `lastWriteLsn` per key and compute staleness as `currentLsn - replicaAppliedLsn` bounded by how far back that specific key was last written. Getting this wrong produces a simulator that says "all reads on a 10ms-lag replica are fresh" which is the opposite of the lesson users need to learn about eventual consistency.
