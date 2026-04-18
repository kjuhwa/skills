---
name: tabular-metric-excluded-from-list
version: 0.1.0-draft
tags: [decision, tabular, metric, excluded, from, list]
category: decision
summary: TABULAR measurement type is intentionally excluded from searchable metric-definition list endpoints
source:
  kind: project
  ref: lucida-performance@0536094
confidence: high
---

# TABULAR metrics are excluded from list endpoints

## Fact

`MeasurementType` defines AVAILABILITY, METRIC, TRAIT, TABULAR — but only `METRIC` is returned by the condition/list endpoints. `MeasurementDefinitionViewRepositoryImpl` filters by `definitionView.getMeasurementType().name().equals("METRIC")` and the TABULAR branch is explicitly commented out.

## Why

Tabular data has different query semantics (row-wise, not time-series aggregatable). Surfacing it in the same UI as time-series metrics would let users pick charts that cannot be rendered. The exclusion is a UX contract, not an oversight — a TABULAR-aware endpoint is planned for later.

## How to apply

- Do not "fix" the TABULAR filter by deleting the guard. It will regress the UI.
- When adding a new `MeasurementType`, explicitly decide whether each listing/query endpoint should include it. Default is **exclude**.
- Tabular query work must go through its own dedicated endpoint when introduced, not be retrofitted into the metric-series one.

## Evidence

- `common/measurement/MeasurementType.java`
- `dao/MeasurementDefinitionViewRepositoryImpl.java` (METRIC check, commented TABULAR branch)
- `controller/PerformanceConditionController.java#findDefinitionsByResourceTypeAndMeasurementType`
