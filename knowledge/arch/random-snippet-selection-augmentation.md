---
version: 0.1.0-draft
name: random-snippet-selection-augmentation
type: knowledge
category: arch
summary: Random Snippet Selection (RSS) augmentation extracts variable-length snippets from training samples — important for textual content types.
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

# Random Snippet Selection Augmentation

## Fact

RSS trains the model on random byte snippets (not just file beginnings), which improves robustness to partial/truncated inputs. Introduced in v3_1 as part of the improvements over v3_0; especially valuable for textual content types where file structure is less rigid.

## Evidence

- `assets/models/CHANGELOG.md:20-24`
