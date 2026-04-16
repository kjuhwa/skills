---
name: object-storage-data-simulation
description: Simulate realistic object storage bucket hierarchies and live operation streams using weighted random generation with domain-accurate proportions.
category: workflow
triggers:
  - object storage data simulation
tags:
  - auto-loop
version: 1.0.0
---

# object-storage-data-simulation

Realistic object storage simulations require bucket profiles that mirror production distributions: a few buckets hold massive data with few objects (e.g., `backups` — 1 TB across 320 snapshots), while others hold many small objects (e.g., `logs-archive` — 512 GB across 198K entries). Static data should include 5-6 representative buckets covering archetypes: **media assets** (large binary blobs), **user uploads** (high object count, mixed sizes), **log archives** (highest object count, time-partitioned), **backups** (largest per-object size, lowest count), **static CDN** (small files, moderate count), and **ML models** (very large individual objects, very low count). Each bucket should carry a `files` sub-array representing prefix-level breakdown (e.g., `videos/`, `2025/`, `db-snapshots/`) for drill-down visualizations.

For live operation simulation, spawn particles or events at a random interval (e.g., 30% chance per frame) with three operation types — `upload`, `download`, `delete` — each assigned a direction vector and distinct color. Distribute operations across bucket swim-lanes using uniform random bucket selection. Particle speed should vary (`0.008 + Math.random() * 0.012`) to avoid visual lockstep. Aggregate counters (uploads/s, downloads/s, throughput MB/s) are smoothed using exponential moving averages (`ups += (u - ups) * 0.1`) to prevent jitter in the HUD. The throughput metric is derived from active upload+download particle count multiplied by a scaling constant, not from actual byte simulation, which keeps the math cheap while looking plausible.

Size formatting must be domain-consistent: object storage spans megabytes to petabytes, so the formatter must chain through MB → GB → TB → PB thresholds. Object counts should use `toLocaleString()` for readability. Time-partitioned buckets (logs, backups) should have sub-entries keyed by year to reflect real-world lifecycle and archival patterns.
