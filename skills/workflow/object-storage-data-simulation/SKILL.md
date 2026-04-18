---

name: object-storage-data-simulation
description: Generating realistic synthetic object storage datasets with proper size/access distributions
category: workflow
triggers:
  - object storage data simulation
tags: [workflow, object, storage, data, simulation, rag]
version: 1.0.0
---

# object-storage-data-simulation

Real object storage workloads follow strongly skewed distributions that uniform random generators fail to capture. Object sizes should be drawn from a bimodal log-normal mixture: one mode around 4–64 KB (thumbnails, metadata, small JSON), another around 4–256 MB (media, backups, parquet parts), with a heavy tail to multi-GB. Access frequency follows a Zipf distribution (alpha ≈ 1.0–1.2) where the top 1% of objects receive ~50% of GETs — this is what makes Intelligent-Tiering and IA cost models meaningful. Simulate object age with a Pareto distribution so lifecycle transition rules (e.g., "move to Glacier after 90 days") produce realistic tier-migration volumes rather than uniform drips.

Generate keys with realistic prefix patterns: tenant ID, date-partitioned segments, and a high-cardinality suffix (UUID or hash). This matters because S3 request throughput historically partitioned on key prefix, and lifecycle/replication filters are prefix-scoped — uniform random keys hide the hotspotting and filter-match behavior that users need to see. For the cost simulator, pair each synthetic object with a request trace (PUTs at creation, GETs following the Zipf weight, occasional LISTs with pagination) so Class-A vs Class-B request charges emerge organically rather than being hand-entered.

For replication simulation, inject realistic failure modes: KMS key access denials on destination, bucket-policy mismatches, object-lock conflicts, and size-based replication lag (larger objects take proportionally longer). Seed the RNG per scenario so users can replay "what-if" experiments deterministically — reproducibility is essential when comparing lifecycle-rule variants side-by-side.
