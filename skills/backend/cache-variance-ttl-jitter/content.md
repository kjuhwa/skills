# Cache TTL Jitter

## Problem
If you warm a cache in a loop (batch load, startup) and use a fixed TTL, every key expires in the same tick. That tick floods the origin (DB, upstream service) with duplicate recompute work.

## Pattern
Each entry's expiry = `baseTtl * (1 - variance) + random(0, 2 * variance * baseTtl)`. With `variance=0.5`, a 60s TTL becomes a uniform sample in `[30s, 90s]`.

## Steps
1. Store per-key `expirationTime` alongside the value (a parallel `Map<K, Long>` or a wrapper value).
2. On `put`, compute `expirationTime = now + baseTtl * (1 - variance) + random.nextLong((long)(2 * variance * baseTtl))`.
3. On `get`, check `expirationTime <= now` → evict and return null (or recompute).
4. Expose `resetExpiration(key)` for hot keys you want to keep alive on access.
5. Schedule a light sweeper (`clearExpiredEntries`) to prevent map growth.
6. Pick `variance` based on downstream capacity: `0.1` for mild smoothing, `0.5` for aggressive. Never zero.

## Why this shape
- Uniform expiry smooths recompute load, not a thundering herd at TTL boundaries.
- Per-key expiration beats global sweeper-only schemes because reads stay O(1).
- Small jitter (`0.1`) is enough if the origin can absorb short bursts; high jitter (`0.5`) is free insurance.

## Anti-patterns
- Single global "expiration tick" (e.g. clear every 60s) — guarantees synchronized reload.
- Using only the current time mod something — introduces hot-spots at tick boundaries.
- Forgetting to bound `random` — with `ThreadLocalRandom.nextLong(0)` you'll hit an IAE.

## Generalize
Works identically for local `ConcurrentHashMap` caches, Caffeine (via `Expiry.expireAfterCreate` returning a jittered duration), or Redis (via `EXPIRE` with a jittered seconds value). The pattern is orthogonal to the cache engine.
