---
version: 0.1.0-draft
name: model-variants-standard-fast-begonly
type: knowledge
category: arch
summary: Magika ships standard / fast / begonly model variants with different speed-vs-accuracy tradeoffs.
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

# Model Variants Standard Fast Begonly

## Fact

standard_v3_3 is the full model (~99% accuracy, ~2ms). fast_v2_1 is ~98.5% accuracy and ~4× faster. begonly_v2_1 only reads the file's beginning (cheaper IO). Current bindings ship standard_v3_3 as default, but the variant is a deployment choice that affects both accuracy and latency.

## Evidence

- `assets/models/CHANGELOG.md:39-42`
- `website-ng/src/content/docs/core-concepts/models-and-content-types.md`
