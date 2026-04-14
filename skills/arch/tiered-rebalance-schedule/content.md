# Tiered Rebalance Schedule

## Problem

A managed portfolio of things — active trading symbols, tenant feature flags, live A/B test arms, scheduled jobs — needs multiple kinds of attention:

- Cheap, fast checks ("is this entity obviously broken right now?").
- Medium-cost re-analysis ("is its chosen policy still the best fit?").
- Expensive rebalance ("should this entity even be in the set?").

Running all three at the same cadence is wasteful at best and destabilizing at worst: expensive rebalances every 5 minutes thrash the system; cheap reviews once a day let dying entities burn hours.

## Pattern

Define **three tiers of scheduled work** on the same set, with increasing intervals and increasing mutation authority:

| Tier | Cadence (example) | Mutation authority |
|------|-------------------|---------------------|
| Performance review | 6h | flag/alert only, and emergency removal |
| Policy re-analysis | 12h | swap active policy (see `adaptive-strategy-hot-swap`) |
| Membership rebalance | 24h | add/remove entities from the managed set |

Each tier runs on its own scheduled executor, has its own last-run timestamp, and has its own thresholds. They share the same managed-set registry — lower tiers *observe* it, higher tiers *mutate* it.

Guardrails:

- **Stagger and serialize.** Don't let rebalance run concurrently with re-analysis on the same entity — use per-entity locks or a global "tier in progress" flag.
- **Backoff on error.** A failing re-analysis should not cascade into a missed rebalance window; wrap each tier's body in try/catch + alert, never let it kill the scheduler.
- **Rate-limit within a tier.** When iterating the set, sleep briefly between entities if each step hits a rate-limited API.

## Example (sanitized)

```java
public void schedulePeriodicTasks() {
    // Tier 1: cheap, frequent — observe + urgent removal
    scheduler.scheduleWithFixedDelay(this::performPerformanceReview,
        6, 6, TimeUnit.HOURS);

    // Tier 2: medium — swap policies if improved enough
    scheduler.scheduleWithFixedDelay(this::performStrategyReanalysis,
        12, 12, TimeUnit.HOURS);

    // Tier 3: expensive — recompose the managed set
    scheduler.scheduleWithFixedDelay(this::performPortfolioRebalancing,
        24, 24, TimeUnit.HOURS);
}

private void performStrategyReanalysis() {
    for (String id : managedSet()) {
        try {
            var fresh = analyzer.analyze(id, windowMonths);
            if (shouldSwap(current(id), fresh)) swap(id, fresh);
            Thread.sleep(100);  // API-friendly pacing
        } catch (Exception e) {
            notifier.error("reanalysis failed: " + id, e);  // never re-throw
        }
    }
    lastReanalysis = Instant.now();
}
```

## When to Use

- Auto-trading / auto-pricing systems with per-symbol adaptive policies.
- Feature-flag or A/B-test orchestrators with many active experiments.
- Multi-tenant schedulers where tenant inclusion itself needs periodic reconsideration.
- Any job system whose work divides naturally into "cheap + frequent" vs "expensive + rare".

## Pitfalls

- **Aligning all three to the same hour.** They'll collide and starve each other. Offset start delays.
- **Higher tier with no lower-tier signal.** Rebalance should *read* what performance-review and re-analysis wrote; if it ignores them it may re-add an entity that review just removed.
- **One big thread pool.** Give each tier its own executor, or at least its own queue, so a slow re-analysis can't block an emergency removal.
- **Swallow-and-continue without alerting.** Silent catch blocks hide real failures. Every caught exception must emit a structured event.
- **Unbounded per-entity sleep.** `Thread.sleep(100)` across 1000 entities is 100s — at that point you've missed the cadence. Parallelize with a bounded worker pool instead.
