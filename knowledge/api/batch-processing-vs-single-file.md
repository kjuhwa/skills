---
version: 0.1.0-draft
name: batch-processing-vs-single-file
type: knowledge
category: api
summary: Python API has both identify_path() (single file) and identify_paths() (batch) — batch is optimized for throughput.
confidence: medium
tags: [magika, api]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Batch Processing Vs Single File

## Fact

The batch variant may apply optimizations (model persistence, parallelization) that beat calling identify_path() in a loop. Implementation detail isn't documented, but the API contract is: prefer identify_paths() when you have multiple files.

## Evidence

- `python/src/magika/magika.py:139-166`
