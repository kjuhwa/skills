---
version: 0.1.0-draft
name: feature-flags-implementation-pitfall
description: Common correctness traps when building feature-flag rollout, dependency, and A/B UIs
category: pitfall
tags:
  - feature
  - auto-loop
---

# feature-flags-implementation-pitfall

The most frequent bug is **non-sticky variant assignment**: recomputing a user's bucket on each evaluation (e.g., per-request random, or hashing without including `flagKey` in the salt) causes users to flip variants between page loads. In an A/B experiment this silently destroys statistical validity — the same user is counted in both arms, conversion attribution becomes meaningless, and the UI still shows confident-looking numbers. Always hash `userId + flagKey + salt` and document the salt as part of the flag's contract; changing the salt is a reset, not a config tweak.

The second trap is **dependency evaluation order**: if a child flag is evaluated before its parent (or in parallel without awaiting), the child can resolve to ON while the parent resolves to OFF in the same request, producing inconsistent feature combinations the UI never designed for. Compounding this, dependency graphs rendered without cycle detection will happily display A→B→A loops that then cause stack overflows or infinite waits at evaluation time — detect cycles at write-time (reject the config) AND at render-time (show the red dashed edge), not just one.

The third trap is **percentage-rollout drift that nobody sees**: target says 50% but actual exposure is 12% because a higher-priority rule (country allowlist, user segment) is short-circuiting evaluation before the percentage bucket is checked. Dashboards that show only `targetPercentage` look healthy while the rollout is effectively stalled. Always compute `actualPercentage` from the evaluation event stream and render it alongside the target — the gap between them is the single most diagnostic number in a feature-flag system, and it's the one most homegrown implementations forget to surface.
