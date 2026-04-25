---
version: 0.1.0-draft
name: model-api-contract-sync-and-async
type: knowledge
category: arch
summary: Rust API exposes both SyncInput and AsyncInput traits so callers can pick blocking or async without two libraries.
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

# Model Api Contract Sync And Async

## Fact

SyncInputApi and AsyncInputApi traits cover the two world-views; core inference logic is shared via generics. Lets the same crate serve a sync CLI and an async HTTP server.

## Evidence

- `rust/lib/src/input.rs:31-46`
