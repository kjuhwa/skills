---
name: etl-data-simulation
description: Generate realistic dirty source data with injected quality defects for ETL demonstration
category: workflow
triggers:
  - etl data simulation
tags:
  - auto-loop
version: 1.0.0
---

# etl-data-simulation

ETL demos fail when source data is too clean—the transform and quality stages have nothing to do. Build a configurable data generator that emits records with tunable defect rates: null injection (5-10% missing fields), type coercion traps (numeric strings, dates in mixed formats like "2026-04-17", "04/17/2026", "17-Apr-26"), duplicate keys (2-3%), referential orphans (foreign keys with no parent), encoding artifacts (smart quotes, trailing whitespace, zero-width spaces), and range violations (negative ages, future birthdates). Expose each defect knob as a slider so presenters can dial in scenarios on demand.

Structure the generator as a pipeline of mutators applied to a clean base record: `baseRecord → nullInjector → dupeInjector → encodingCorrupter → rangeViolator`. Emit records on a setInterval at a configurable rate (10-1000 rec/sec) and buffer them in a ring buffer of the last ~1000 records so the visualization can scroll backward. Tag each record with a `_defects: string[]` meta field so the downstream quality stage can score ground-truth detection rates—this lets the radar show both claimed quality scores and actual defect catch rates, which is the most compelling demo moment.
