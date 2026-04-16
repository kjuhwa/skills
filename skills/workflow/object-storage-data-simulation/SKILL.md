---
name: object-storage-data-simulation
description: Patterns for generating realistic synthetic object-storage data including bucket hierarchies, object metadata, tiered lifecycle progression, and size distributions.
category: workflow
triggers:
  - object storage data simulation
tags:
  - auto-loop
version: 1.0.0
---

# object-storage-data-simulation

Simulating object-storage workloads requires modeling three distinct data shapes that mirror real S3-compatible systems. **Flat object lists** (galaxy pattern): generate objects per bucket with `{name, bucket, sizeKB, angle, speed}` where `sizeKB` follows a uniform random range (100–9100 KB) and names use `obj_${random-base36}.dat`. Object count per bucket varies (8–24) to simulate real-world imbalance where log buckets accumulate far more objects than backup buckets. **Hierarchical prefix trees** (treemap pattern): model the bucket → prefix → object nesting with `{name, size, color, children[]}` where leaf `size` represents MB and parent size is the recursive sum of children. Realistic prefix structures mirror actual usage — `images/` splits into `thumbs/`, `originals/`, `webp/`; `logs/` splits into `access/`, `error/`, `audit/` — and size ratios reflect that originals dwarf thumbnails and access logs dwarf audit logs.

**Lifecycle state machines** (flow pattern): objects progress through storage tiers (Ingest → Hot Store → Warm Store → Archive → Deleted) modeled as a `stage` index with a `progress` counter that increments per frame and triggers transition after a randomized threshold (200–500 ticks). This simulates real lifecycle policies where objects age through tiers at varying rates. Statistics accumulators (`{objects, archived, deleted}`) track aggregate counts. The `speed` property (0.4–1.0) models variable ingestion throughput. New objects are injected via an `ingest()` function callable by user interaction or on interval, simulating upload bursts. Dead objects (`alive: false`) remain in the array but skip rendering — a deliberate choice over splice-removal to avoid index shifting during iteration.
