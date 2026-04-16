---
name: object-storage-data-simulation
description: Three strategies for generating realistic object-storage test data — procedural, static, and seed-plus-mutation.
category: workflow
triggers:
  - object storage data simulation
tags:
  - auto-loop
version: 1.0.0
---

# object-storage-data-simulation

Object-storage demos need believable bucket/object hierarchies without a real S3 backend. The **procedural** strategy (used in the galaxy app) generates N objects per bucket where N is randomized (`12 + Math.floor(Math.random() * 10)`), assigns each object an orbital position via random angle and distance from a bucket center, and fills metadata from template arrays: names follow `bucket/type_index.ext` with extensions drawn from `['png','jpg','mp4','log','sql','tar.gz','pdf','csv']`, sizes range 1–9999 KB, and dates are built from randomized month/day components (`2026-0${rand(1,5)}-${padded day}`). This gives volume and visual density but sacrifices realism — sizes are uniformly distributed rather than following the power-law distribution typical of real object stores where a few large backups coexist with many small assets.

The **static/hardcoded** strategy (treemap app) defines a fixed array of 5 buckets with 4–5 objects each, using realistic names (`avatar.png`, `db-full-0412.sql.gz`, `access-2026-04.log`) and hand-tuned sizes (240 KB to 48,000 KB) that produce meaningful proportional differences in the treemap. This approach guarantees a curated demo experience but doesn't scale to stress-testing or randomized QA. The **seed-plus-mutation** strategy (terminal app) initializes a mutable store with a `seed()` function placing 6 known objects across 3 buckets, then allows the CLI `put` command to add new objects with random sizes (`Math.floor(Math.random() * 5000) + 10`). The store uses a nested-object shape (`store[bucket][key]`) enabling O(1) lookups for `get`/`rm`/`stat`. This hybrid approach supports both repeatable demos and exploratory testing. When building object-storage simulations, combine all three: use procedural generation for load testing (but apply log-normal size distributions instead of uniform), static data for screenshot-stable demos, and seed-plus-mutation for interactive prototypes.
