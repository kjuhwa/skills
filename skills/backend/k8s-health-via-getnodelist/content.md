# Kubernetes Availability via getNodeList, Not getVersion

## When to use
Collector/monitor needs a reliable liveness check against a Kubernetes/OpenShift API server before running real work.

## Steps
1. Call `CoreV1Api.listNode()` (or equivalent) and verify at least one node exists and is `Ready`.
2. Do NOT use `getVersion()` as a health check — it succeeds even when the cluster is in a degraded state that would fail real queries.
3. Add a short TTL cache (e.g., 30s) so probes don't thrash the API server.
4. Retry transient failures with exponential backoff; only mark cluster down after N consecutive misses.

## Watch out for
- RBAC: the service account must have `list nodes` permission; fail loudly if 403.
- Large clusters: `listNode` payload can be MB-scale — paginate or request minimal fields if available.
