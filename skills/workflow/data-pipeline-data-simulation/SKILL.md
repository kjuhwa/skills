---
name: data-pipeline-data-simulation
description: Probabilistic record spawning, random-walk throughput, and stage-specific failure injection patterns for realistic pipeline data generation.
category: workflow
triggers:
  - data pipeline data simulation
tags:
  - auto-loop
version: 1.0.0
---

# data-pipeline-data-simulation

Pipeline data simulation uses three complementary strategies depending on the visualization type. For flow monitors, records spawn probabilistically each animation frame (e.g., Math.random()<0.15 gives ~15% spawn rate per tick) with each record assigned a random speed (0.8+Math.random()*0.6), a boolean fail flag (Math.random()<0.08 for ~8% failure rate), and a failAt stage index (Math.floor(Math.random()*stageCount)). Records advance through stages by accumulating progress until crossing a threshold (e.g., 140px per stage), at which point they transition to the next stage or complete. Failed records turn red at their designated stage and are removed after a visual delay (setTimeout 400ms). This creates realistic variance in record processing times without requiring actual data transformation logic.

For throughput dashboards, a random-walk model generates time-series data: initialize 30 data points per pipeline in the range 200-1000 rec/s, then on each 1-second tick shift the oldest point out and push a new value calculated as Math.max(floor, previousValue + Math.floor(Math.random()*range - range/2)). The floor (e.g., 50 rec/s) prevents complete pipeline stalls, while the symmetric random delta (±100) creates natural drift that approximates real pipeline throughput fluctuations. Multiple pipelines (e.g., "Orders ETL", "Clickstream", "User Sync", "Logs Agg") simulate independently with no cross-correlation.

For DAG builders, initial topology is seeded with a hardcoded graph (e.g., Kafka Source→Validate→Enrich→Postgres Sink with a parallel Parse JSON→Enrich branch). New nodes draw names from a cycling pool of pipeline operations ['Source','Filter','Map','Join','Aggregate','Sink','Dedupe','Enrich'] and are placed at random positions within the canvas bounds (100+Math.random()*600 for x, 60+Math.random()*280 for y). Execution simulation steps through connected nodes sequentially with 500ms delays per stage, highlighting each node in turn.
