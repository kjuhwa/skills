---

name: cdc-data-simulation
description: Generating realistic synthetic CDC event streams with proper transaction grouping, LSN monotonicity, and schema evolution
category: workflow
triggers:
  - cdc data simulation
tags: [workflow, cdc, data, simulation, schema, transaction]
version: 1.0.0
---

# cdc-data-simulation

Simulated CDC streams must respect three invariants that real capture processes guarantee, or the demo will teach wrong mental models. First, LSN/position monotonicity: every generated event must carry a strictly increasing log position within a source, even when transactions are interleaved across tables. Maintain a single monotonic counter per simulated source and hand out positions atomically. Second, transaction grouping: real CDC emits events in transaction-commit order with a shared transaction ID, so simulators should batch 1–N row changes under one `txId` and emit them contiguously with a final `COMMIT` marker event — never sprinkle events from the same txn across unrelated rows.

Model realistic change distributions rather than uniform random noise. Production CDC streams are heavily skewed: ~70% UPDATE, ~20% INSERT, ~8% DELETE, ~2% DDL, with bursty patterns (idle periods punctuated by batch-job spikes). Use a weighted sampler with a Poisson arrival process plus occasional burst multipliers. For UPDATE events, generate realistic before/after diffs by mutating only 1–3 fields of the prior row image, not regenerating the whole record — this matches how real applications write.

Seed schema evolution events deterministically on a timeline (e.g., ADD COLUMN at t+60s, DROP COLUMN at t+180s) so replay tools can be exercised against schema drift scenarios. Persist the simulation seed alongside generated output so runs are reproducible, and expose a "fast-forward" knob that advances wall-clock time while preserving LSN ordering — reviewers need to replay an hour of traffic in 30 seconds.
