---
name: bulkhead-implementation-pitfall
description: Shared thread pool or shared semaphore silently defeats bulkhead isolation despite correct-looking per-pool config
category: pitfall
tags:
  - bulkhead
  - auto-loop
---

# bulkhead-implementation-pitfall

The most common bulkhead mistake is configuring per-pool limits on top of a shared underlying executor. Developers create `BulkheadA(max=10)` and `BulkheadB(max=10)` but both submit to the same `ForkJoinPool.commonPool()` or a shared `CachedThreadPool`. When pool A floods, it consumes all executor threads; pool B's semaphore says "you may proceed" but there is no thread to run on, so pool B starves despite appearing healthy in metrics. The fix is a dedicated executor per bulkhead, and a test that saturates A while asserting B's p99 latency is unchanged.

A second trap: counting queued requests toward the "in-flight" limit. If admission checks `inFlight + queued < max`, you have built a single queue with a cap, not a bulkhead — the queue becomes the contention point and slow pools back up into fast ones when they share downstream resources (DB connections, HTTP client). Keep `inFlight` and `queued` as distinct counters with distinct caps, and make sure each pool owns its own downstream client instance too, otherwise the bulkhead stops at the application boundary.

Third: unbounded queue with timeout-based rejection. Teams set `queueSize=∞` and rely on request timeouts to shed load. Under sustained overload the queue grows, every request waits the full timeout before failing, and latency collapses. Bulkhead must reject fast (bounded queue, synchronous `rejected++`) so callers get immediate backpressure signal. The visualization is useful here precisely because it makes the "silent queue growth → cliff" failure mode obvious in a way dashboards with averaged latency do not.
