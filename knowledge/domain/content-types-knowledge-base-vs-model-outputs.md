---
name: content-types-knowledge-base-vs-model-outputs
type: knowledge
category: domain
summary: content_types_kb.min.json is a research superset — distinct from any single model's actual output space.
confidence: high
tags: [magika, domain]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Content Types Knowledge Base Vs Model Outputs

## Fact

The internal knowledge base lists all content types Magika research is interested in. A given model only outputs a subset (200+ for standard_v3_3). Always check the model's own README for its supported types instead of assuming the KB defines model capability. Each model has 'model outputs' (raw NN labels) and 'tool outputs' (model outputs + generic fallbacks).

## Evidence

- `website-ng/src/content/docs/core-concepts/models-and-content-types.md:19-21`
