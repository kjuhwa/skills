---
version: 0.1.0-draft
name: stream-seeking-and-position-preservation
type: knowledge
category: api
summary: identify_stream() seeks around the stream for feature extraction but restores the original position before returning.
confidence: high
tags: [magika, api]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Stream Seeking And Position Preservation

## Fact

Calling identify_stream(f) seeks to beg/mid/end to extract features, then seeks back so the stream remains usable. Magika does NOT close the stream — that's the caller's responsibility. This lets you inspect a file mid-pipeline without re-opening or copying.

## Evidence

- `python/src/magika/magika.py:177-183`
- `commit 472d126`
