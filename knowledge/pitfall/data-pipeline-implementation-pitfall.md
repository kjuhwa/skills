---
name: data-pipeline-implementation-pitfall
description: Common mistakes that make pipeline visualizations look broken, lie about state, or degrade at scale
category: pitfall
tags:
  - data
  - auto-loop
---

# data-pipeline-implementation-pitfall

The most common pitfall is treating each stage as statistically independent — rolling fresh random throughput values per tick per stage. This produces visualizations where the "extract" stage shows 10k rec/s while the immediately downstream "transform" stage shows 200 rec/s with no lag accumulation, which any viewer with pipeline experience spots as fake instantly. Always conserve flow: `stage[i+1].ingest_rate = min(stage[i].output_rate, stage[i+1].max_processing_rate)` and grow the buffer/lag metric from the delta. Similarly, error events must propagate — a failed record at stage 2 cannot silently disappear; it either goes to a DLQ node (make it visible), retries (animate it), or drops (increment a counter).

A second pitfall is unbounded data accumulation. Throughput sparklines, edge particle arrays, and event logs all grow per tick; without ring-buffer caps a 10-minute demo consumes hundreds of MB and the animation stutters. Cap everything — typically 300-600 history points per stage, max 50-100 in-flight particles per edge regardless of "true" rate (scale particle meaning, not count), and virtualize any event log exceeding ~200 rows. Also avoid rendering every edge particle as its own DOM/React element; use canvas, SVG `<use>` references, or CSS `@property`-driven animations so 1000+ particles don't murder the main thread.

A third pitfall is conflating "pipeline stopped" with "no data". When a stage breaks, naive implementations show zero throughput and a flat line that looks identical to "pipeline is idle overnight". Always distinguish the three states visually: running-healthy, running-degraded, and halted/failed — with explicit iconography and color, not just a value of zero. For etl-job-scheduler specifically, also distinguish "scheduled but not yet started" from "running" from "completed" from "failed" — four states minimum, because a user looking at a dashboard at 03:00 needs to know instantly whether the 02:30 job is late or successfully done.
