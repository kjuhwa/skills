---
version: 0.1.0-draft
name: model-trained-on-100m-samples
type: knowledge
category: domain
summary: Magika's standard models are trained on ~100M files spanning 200+ content types.
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

# Model Trained On 100M Samples

## Fact

The training corpus is curated from Google's internal file distributions, which is what underwrites the ~99% average accuracy claim and the broad type coverage (modern JS/TS variants, newer document formats, etc.). Smaller corpora produce noticeably worse coverage on long-tail types.

## Evidence

- `README.md:15`
- `website-ng/src/content/docs/introduction/overview.md:5`
