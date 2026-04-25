---
version: 0.1.0-draft
name: csv-regression-v3-2-dataset-balance
type: knowledge
category: pitfall
summary: standard_v3_2 fixed a CSV-detection regression by adding synthetic CSV training data and switching the model-selection criterion to minimal test loss.
confidence: high
tags: [magika, pitfall]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Csv Regression V3 2 Dataset Balance

## Fact

v3_1 regressed on CSV detection. v3_2 introduced new synthetic CSV datasets with balanced class representation and changed model selection from a heuristic to minimal test loss. The lesson: dataset rebalancing AND a measurable selection criterion together prevent silent regressions.

## Evidence

- `assets/models/CHANGELOG.md:14-17`
