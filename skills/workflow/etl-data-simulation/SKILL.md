---
name: etl-data-simulation
description: Generate realistic synthetic ETL pipeline data including job states, row volumes, null distributions, and time-series ingestion metrics for UI prototyping.
category: workflow
triggers:
  - etl data simulation
tags:
  - auto-loop
version: 1.0.0
---

# etl-data-simulation

ETL data simulation requires modeling three distinct data shapes simultaneously. First, pipeline job metadata: each job needs a human-readable name following the "Source Entity → Destination" convention (e.g., "User Events → Warehouse"), explicit source and destination system names (Kafka, PostgreSQL, S3 Parquet for sources; BigQuery, Elasticsearch, Snowflake for destinations), a row count, a percentage-complete value, elapsed duration string, and a status enum of exactly four states — running, done, failed, queued. Seed 5–8 jobs with a realistic distribution: ~30% running, ~30% done, ~15% failed, ~15% queued. For live-tick simulation, running jobs increment their percentage by a small random delta (0–3%) each tick and accumulate rows (random 0–800 per tick), transitioning to "done" at 100%. Queued jobs probabilistically promote to "running" (e.g., 8% chance per tick) to simulate scheduler behavior.

Second, tabular data profiling: define a schema of 5–8 typed columns (INT, VARCHAR, DATE, FLOAT, BOOL) representing a realistic entity like user records. Generate 30–50 rows where nullable columns (email, revenue) have a controlled null rate (8–12%) to ensure the profiling UI has meaningful gaps to visualize. Null injection should use `Math.random() > threshold` per cell so the distribution is stochastic, not uniform. Countries, dates, and booleans should sample from bounded arrays to produce plausible cardinality (e.g., 7 country codes, dates within a single year, 70/30 boolean split).

Third, time-series volume data: generate 24 data points representing hourly ingestion counts, each randomized within a band (e.g., 200–1000 rows/hour) to create a believable sparkline. The key constraint across all three shapes is that simulated data must produce non-trivial visual output — zero nulls, flat volume, or all-same-status jobs defeat the purpose. Always include at least one failed job, at least one column with nulls, and volume variance of at least 3× between min and max points to ensure the prototype UI demonstrates its full visual vocabulary.
