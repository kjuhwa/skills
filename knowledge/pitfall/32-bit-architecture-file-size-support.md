---
version: 0.1.0-draft
name: 32-bit-architecture-file-size-support
type: knowledge
category: pitfall
summary: Switch file-size APIs from usize to u64 to handle >4GB files on 32-bit hosts.
confidence: high
tags: [magika, pitfall]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# 32 Bit Architecture File Size Support

## Fact

Magika originally used usize for file lengths and offsets; on 32-bit targets that's u32 and capped at ~4GB. The fix moves to u64 everywhere with a static assertion that u64 ≥ usize so conversions stay no-ops on 64-bit. Any library that may run on 32-bit + handle large files needs this upfront, not as a v2 fix.

## Evidence

- `commit 1a5d274`
- `rust/lib/src/input.rs:32-45`
