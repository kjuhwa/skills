---
version: 0.1.0-draft
name: magika-sampling-strategy
type: knowledge
category: arch
summary: Magika samples beginning, middle, and end blocks of a file rather than processing all bytes.
confidence: high
tags: [magika, arch]
linked_skills: [beg-mid-end-file-sampling-with-padding]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Magika Sampling Strategy

## Fact

Magika reads only fixed-size blocks (config: beg_size=1024, end_size=1024, block_size=4096) using seek(), so inference time stays roughly constant (~5ms) regardless of file size — even multi-GB files. This is the central design choice that makes deep-learning-based file classification fast enough for production.

## Evidence

- `rust/lib/src/model.rs:24-28`
- `website-ng/src/content/docs/core-concepts/how-magika-works.md:7-12`
