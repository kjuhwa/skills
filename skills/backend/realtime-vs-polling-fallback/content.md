# Real-Time vs Polling Fallback

## When to use
Monitoring/collection pipeline where some resource types expose push/streaming metrics and others only expose pull-based APIs.

## Steps
1. Declare per-resource-type capability `supportsRealtime: bool` on the provider.
2. If `true`: schedule at the configured realtime interval (e.g., 5–10s).
3. If `false`: schedule at a safe polling interval (default 60s; tune per-resource-type — e.g., network 6–10s).
4. Centralize interval constants in config (`management.realtime.interval.<resourceType>`), not in code.
5. Log which mode each resource runs in on startup so ops can sanity-check.

## Watch out for
- Don't apply the realtime interval to non-realtime resources — it burns API quota and triggers rate limits.
- When adding a new resource type, default to polling until realtime is explicitly validated.
