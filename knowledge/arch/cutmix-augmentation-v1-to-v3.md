---
version: 0.1.0-draft
name: cutmix-augmentation-v1-to-v3
type: knowledge
category: arch
summary: CutMix data augmentation was used in v1, removed in v2_1, and reintroduced in v3_1.
confidence: high
tags: [magika, arch]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Cutmix Augmentation V1 To V3

## Fact

CutMix mixes random sections of training samples for regularization. It was dropped during the v2_1 refactor, then brought back in v3_1 because it measurably improved detection of short/textual inputs and JavaScript variants. The history is a record of iterative refinement — augmentation choices were re-evaluated against specific failure modes seen in production.

## Evidence

- `assets/models/CHANGELOG.md:19-24`
