---
version: 0.1.0-draft
name: per-content-type-threshold-system
type: knowledge
category: arch
summary: Magika gates predictions with per-content-type confidence thresholds (range ~0.5–0.95), not a single global threshold.
confidence: high
tags: [magika, arch]
linked_skills: [per-content-type-confidence-threshold-dispatch]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Per Content Type Threshold System

## Fact

Each of the 200+ content types gets its own threshold tuned from validation data — PDFs sit near 0.99, JavaScript closer to 0.80. Users adjust this behavior via prediction modes (high-confidence / medium-confidence / best-guess), which trade precision for recall.

## Evidence

- `rust/lib/src/model.rs:33-34`
- `website-ng/src/content/docs/core-concepts/prediction-modes.md:5-12`
