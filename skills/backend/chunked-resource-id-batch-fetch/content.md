# Chunked Resource ID Batch Fetch

## When to use
A monitor/report/bulk-query accepts N target IDs where N can reach thousands — direct `WHERE id IN (…)` or ES terms query will hit bind-param limits (MSSQL 2100, Oracle 1000) or memory ceilings.

## Steps
1. Pick a chunk size that is safe across all target backends (1000 is conservative; expose as config).
2. Split the ID list, issue one query per chunk, merge results in the service layer.
3. For ES, use `_msearch` or separate `terms` queries per chunk; avoid a single terms query > 65536 items.
4. Surface the chunk size as a tunable (`…search.batchSize=1000`).
5. Fail fast if any chunk fails; don't silently return partial results unless the caller opts in.

## Watch out for
- Sort stability across chunks — re-sort after merge if order matters.
- N+1-ish overhead: batch merge, don't iterate per-ID.
