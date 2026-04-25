---
name: block-size-stream-re-read-limit
type: knowledge
category: pitfall
summary: When re-reading a stream during feature extraction, cap the read at block_size — never read the whole stream.
confidence: medium
tags: [magika, pitfall]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Block Size Stream Re Read Limit

## Fact

identify_stream() seeks around the stream to extract beg/mid/end blocks. If a re-read isn't capped to block_size (default 4096), it can buffer the entire stream into memory, defeating the constant-time-per-file optimization. Magika hit this regression and fixed it in commit 2750c2b.

## Evidence

- `commit 2750c2b`
- `python/src/magika/magika.py feature extraction`
