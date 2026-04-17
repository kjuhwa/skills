---
name: lantern-data-simulation
description: Deterministic seeded lantern corpus generator shared across festival, cipher, and explorer apps
category: workflow
triggers:
  - lantern data simulation
tags:
  - auto-loop
version: 1.0.0
---

# lantern-data-simulation

All three apps consume the same synthetic corpus shape: `Lantern = {id, releasedAt, lat, lng, hue, message, cipherKey, releaserHandle}`. Generate it from a single seeded PRNG (mulberry32 keyed off a string like `"lunar-2026"`) so festival, cipher, and explorer show the *same* lanterns when pointed at the same seed — this is what lets a lantern released in the festival view be decoded in cipher and located on the explorer map without a backend. Never use `Math.random()` during generation; it breaks cross-app consistency and makes screenshots non-reproducible.

The generator produces ~2000 lanterns distributed across a 14-day festival window with a diurnal bias (80% of releases between 19:00–23:00 local), lat/lng clustered around 6–8 hand-picked festival cities using gaussian jitter (σ ≈ 0.15°), and messages drawn from a templated pool then XOR-masked with `cipherKey` so the cipher app has real work to do. Persist the corpus as a single `lanterns.json` (~300 KB gzipped) served statically; do not regenerate client-side on each load, or explorer's map clustering will thrash. Expose a `filterLanterns({tBefore, bbox, hueRange})` helper — all three apps need slice views, not the full set.

When extending: add new fields as nullable so older snapshots still parse, and bump a `corpusVersion` string rather than mutating the seed (changing the seed invalidates every shared link anyone has posted). If you need per-user lanterns layered on top, keep them in a separate `userLanterns` array merged at read time — mixing them into the seeded corpus pollutes the deterministic view.
