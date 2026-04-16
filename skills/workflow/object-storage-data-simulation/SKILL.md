---
name: object-storage-data-simulation
description: Strategies for generating realistic synthetic object-storage data — bucket populations, S3 API latency distributions, and tiered lifecycle transitions.
category: workflow
triggers:
  - object storage data simulation
tags:
  - auto-loop
version: 1.0.0
---

# object-storage-data-simulation

Simulating object-storage workloads requires three distinct data generators: **object population seeds**, **API latency models**, and **lifecycle transition schedules**. For bucket population, the bucket-viz app generates objects with `Math.random() * 800 + 50` byte sizes across five content types (image/video/doc/archive/data), assigning mock keys with type-appropriate extensions (`.png`, `.mp4`, `.pdf`, `.tar.gz`, `.csv`). This uniform random distribution is adequate for demos but unrealistic — real S3 buckets follow power-law size distributions where a few large video/backup objects dominate total bytes while thousands of small config/log files dominate object count. A more accurate generator would use `Math.pow(Math.random(), 3) * maxSize` to produce a long-tail distribution, then assign types probabilistically weighted by size band.

The latency-monitor models S3 API timing as `base + random * base * 1.2 + spike`, where base latencies reflect real-world S3 characteristics: GET≈22ms, PUT≈45ms, DELETE≈18ms, LIST≈70ms. The 7% spike probability (`Math.random() < 0.07`) injects latency outliers up to 200ms above base, simulating network jitter or cross-region calls. This two-component model (normal variance + rare spikes) is the minimum viable latency simulator for object-storage dashboards. For higher fidelity, add a third component: periodic throughput degradation (sine wave with 30-60 second period) to simulate S3 partition rebalancing or throttling under sustained load.

Lifecycle simulation requires per-object transition thresholds rather than global rules. The lifecycle-sim assigns each object individual `toWarm`, `toCold`, and `toDelete` day offsets (15-35, 45-75, 90-150) randomized at seed time, then advances a discrete day counter where each tick evaluates `dayAge >= threshold` to determine tier transitions. This per-object schedule mirrors real S3 lifecycle policies where different prefixes or tags have different transition rules. The cost model applies daily per-GB rates (Hot=$0.023, Warm=$0.0125, Cold=$0.004) — actual S3 Standard/IA/Glacier pricing — accumulated into a running total. A missing but important simulation element is retrieval cost: Glacier restores cost $0.01-0.03/GB and take hours, which dramatically changes the cost calculus when objects in cold storage are accessed frequently.
