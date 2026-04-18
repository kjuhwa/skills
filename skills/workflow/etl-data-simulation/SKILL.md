---

name: etl-data-simulation
description: Deterministic mock ETL data generation with realistic row counts, schemas, and job run histories
category: workflow
triggers:
  - etl data simulation
tags: [workflow, etl, data, simulation, schema]
version: 1.0.0
---

# etl-data-simulation

ETL demo apps need three layers of synthetic data: schema definitions (tables with typed columns), row samples (10-50 rows per table showing realistic values, not lorem ipsum), and run history (timestamped job executions with durations, statuses, row counts). Use a seeded PRNG (mulberry32 with a fixed seed like 0x5E7ED) so every page reload shows identical data — this is critical for screenshots, demos, and debugging. Generate schemas for canonical domains users recognize instantly: `orders`, `customers`, `products`, `events`, `sessions`. Include a mix of PK/FK relationships, nullable columns, and at least one JSON/array column per schema to exercise edge cases.

For job run history, generate 30-90 days of runs with realistic patterns: daily batch at 02:00 UTC, occasional failures (5-10% rate), duration that scales with simulated row count, and late-arriving data spikes on Mondays. For etl-rule-builder specifically, every rule must have a "before/after" row-pair preview — generate 5 representative input rows and compute the output rows in real-time as the user edits the rule, showing NULL handling, type coercion, and cast failures explicitly.

Lineage apps need cross-table dependency graphs: 15-30 tables with an average of 2-3 upstream dependencies, creating a realistic DAG depth of 4-6 levels. Avoid cycles deterministically by generating tables in topological order and only adding edges from later-index to earlier-index tables. Store the whole simulated dataset in a single `/src/mock/etlFixtures.ts` file so it's trivially replaceable with a real API adapter later.
