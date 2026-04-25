---
version: 0.1.0-draft
name: seekable-abstraction-for-io
type: knowledge
category: arch
summary: Python uses a Seekable wrapper to unify bytes / paths / streams under one feature-extraction codepath.
confidence: medium
tags: [magika, arch]
linked_skills: [platform-agnostic-file-input-abstraction]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Seekable Abstraction For Io

## Fact

The Python API wraps file-like objects and byte buffers in a Seekable abstraction with a consistent seek/read interface. Lets identify_bytes / identify_path / identify_stream share core logic without duplication.

## Evidence

- `python/src/magika/magika.py:43`
- `commit 595c093`
