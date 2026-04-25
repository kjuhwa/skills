---
version: 0.1.0-draft
name: model-not-used-for-edge-cases
type: knowledge
category: arch
summary: The deep learning model is intentionally bypassed for empty files, directories, symlinks, and very small files (<8 bytes).
confidence: high
tags: [magika, arch]
linked_skills: [predict-mode-dispatch-with-fallback-heuristics]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Model Not Used For Edge Cases

## Fact

These cases use hardcoded labels (empty / directory / symlink / txt / unknown) rather than the model — the model would have no meaningful input. dl.label is set to 'undefined' for these so callers can see the model wasn't consulted.

## Evidence

- `website-ng/src/content/docs/core-concepts/how-magika-works.md:17-21`
