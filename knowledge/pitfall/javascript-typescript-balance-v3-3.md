---
version: 0.1.0-draft
name: javascript-typescript-balance-v3-3
type: knowledge
category: pitfall
summary: standard_v3_3 raised TypeScript accuracy from ~85% → 95% by rebalancing the JavaScript-vs-TypeScript training split.
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

# Javascript Typescript Balance V3 3

## Fact

Earlier versions had a JS/TS dataset imbalance that hurt TypeScript recall. The rebalance in v3_3 demonstrates how sensitive the model is to class proportions even when the two classes are syntactically similar.

## Evidence

- `assets/models/CHANGELOG.md:7-12`
