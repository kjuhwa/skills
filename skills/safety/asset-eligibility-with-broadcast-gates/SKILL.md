---
name: asset-eligibility-with-broadcast-gates
description: Multi-gate eligibility checks before exporting assets — content hash, success streak, confidence
category: safety
version: 1.0.0
version_origin: extracted
confidence: high
tags: [evolver, safety, publish-gate, integrity]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/a2a.js
  - src/gep/contentHash.js
imported_at: 2026-04-18T00:00:00Z
---

# Broadcast-eligibility gates before publishing assets

Before an asset (capsule, gene, skill) leaves the local system, require three independent gates:
1. **Integrity** — recomputed content hash must match the stored ID.
2. **Success streak** — minimum consecutive successful validations.
3. **Confidence floor** — score ≥ broadcast threshold (e.g., 0.7).

Each gate is independent; all must pass. Skip modes are allowed per-context (e.g., hash check only on manual overrides) but must be logged.

## Mechanism

```js
function isBroadcastEligible(asset, policy) {
  const gates = [
    contentHash(asset.body) === asset.id,
    asset.success_streak >= policy.minStreak,
    asset.score >= policy.minScore,
  ];
  return gates.every(Boolean);
}
```

## When to reuse

Any publish/promote/share workflow where half-baked outputs would pollute downstream consumers — plugin hubs, shared cache layers, federated registries.
