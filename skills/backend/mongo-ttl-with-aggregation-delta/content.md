# mongo-ttl-with-aggregation-delta

## Shape

Collection: `{resourceId, metricName, value, collectedAt}` with TTL index on `collectedAt` set just wider than your sampling interval (e.g. 5 min TTL for 60s samples — 5× headroom).

Delta read pipeline:
```
match { resourceId, metricName }
sort  { collectedAt: -1 }
limit 2
group { _id: null, current: $first.value, previous: $last.value }
project { delta: { $subtract: ["$current", "$previous"] } }
```

## Steps

1. Create TTL index: `db.coll.createIndex({ collectedAt: 1 }, { expireAfterSeconds: 300 })`. MongoDB reaps on a 60s cadence — TTL is lower bound, not exact.
2. Upsert on `{resourceId, metricName, bucket}` where `bucket` rounds `collectedAt` to sample interval — prevents duplicate inserts when a tick arrives twice.
3. Bulk write (`bulkOps` unordered) for a batch of metrics per collection cycle; one round-trip per target, not per metric.
4. On the read path, fall back to `null` delta if fewer than 2 samples exist — don't synthesize zero.
5. Separate the "raw" collection (TTL'd) from any "rolled-up" collection (longer retention); never put them in one collection with mixed TTL.

## Counter / Caveats

- TTL index cannot be compound on the date field; if you need fast tenant filtering, add a **separate** compound index `(resourceId, metricName, collectedAt)` — two indexes, not one.
- If the counter resets (process restart), `$subtract` produces a negative delta — clamp at read time, or detect reset via a marker field.
- TTL does not fire on a shard with zero writes; on sharded clusters, watch for uneven expiry.
- Document size grows if you store labels/tags inline — keep the hot doc narrow.

## Test hooks

- Testcontainers Mongo: insert 3 samples 60s apart (use `@Indexed(expireAfter = "PT0S")` with manual dates), run pipeline, assert delta = last − second-to-last.
- Reset test: insert sequence `100, 110, 5` → assert clamp behavior per your policy.
