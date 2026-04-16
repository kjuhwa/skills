---
name: feature-flags-implementation-pitfall
description: Common traps when building feature-flag tooling: non-deterministic bucketing, missing dependency cycles, and Simpson's-paradox A/B reads
category: pitfall
tags:
  - feature
  - auto-loop
---

# feature-flags-implementation-pitfall

The most damaging pitfall is **non-deterministic or re-hashed bucketing**. If you compute rollout membership with `Math.random()`, or hash with `userId` alone (without the flag key as salt), users will flip in and out of the rollout on every page load, or every flag will exhibit the same 10% cohort. Both produce user-visible flicker and invalidate every A/B result. The fix is non-negotiable: `hash(flagKey + ':' + stableUserId)` mapped to a fixed integer space (usually 10000 basis points), compared once against the rollout threshold. The simulator must model this or it will mask the bug instead of surface it.

The second pitfall is **implicit dependency cycles**. Flag A gates flag B which gates flag C which — via a targeting rule written six months later — references flag A. The evaluator recurses until the stack blows. Naïve dependency-graph UIs render this without complaint because they draw edges as they find them. Any feature-flag tool must detect cycles on write (reject the save) *and* on read (break the cycle with a documented fallback, log the incident). Related: a flag depending on an *archived* parent should hard-fail in staging and soft-fail (return default) in production — the dependency-graph app should color-code these "dangling parent" edges in red, not hide them.

The third pitfall hits A/B dashboards specifically: **Simpson's paradox from uneven cohort assignment**. If a rollout ramps from 1% → 50% over a week, early users are disproportionately power-users (they hit the app first) and late users skew casual. Comparing variant-A vs variant-B aggregate conversion across that window can show a "winner" that reverses when segmented by week. Mitigations: (1) only compare users who entered the experiment within the same ramp stage, (2) display the cohort-entry-time distribution alongside the headline metric, (3) require a minimum stable-traffic window before declaring significance. A dashboard that shows a p-value without showing ramp-stability is actively misleading, not merely incomplete.
