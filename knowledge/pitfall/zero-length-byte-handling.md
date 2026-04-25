---
version: 0.1.0-draft
name: zero-length-byte-handling
type: knowledge
category: pitfall
summary: Files smaller than min_file_size_for_dl (~8 bytes) bypass the model and use heuristics — they may return generic labels.
confidence: medium
tags: [magika, pitfall]
linked_skills: [sparse-text-data-utf8-detection-fallback]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Zero Length Byte Handling

## Fact

For tiny files, Magika returns 'txt' (if bytes look like text) or 'unknown' (binary-ish). The model is not invoked because there's not enough signal. Don't expect specific-type detection for files under the threshold — design downstream consumers to handle 'txt'/'unknown' for tiny inputs.

## Evidence

- `website-ng/src/content/docs/core-concepts/how-magika-works.md:21`
- `rust/lib/src/model.rs:26`
