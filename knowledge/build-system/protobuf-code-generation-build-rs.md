---
version: 0.1.0-draft
name: protobuf-code-generation-build-rs
type: knowledge
category: build-system
summary: Protobuf codegen runs in build.rs via prost; generated types auto-derive Serialize/Deserialize for FFI reuse.
confidence: medium
tags: [build, code, generation, protobuf, system]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: Cargo.toml
imported_at: 2026-04-19T00:00:00Z
---

# Protobuf Code Generation Build Rs

## Fact
Protobuf codegen runs in build.rs via prost; generated types auto-derive Serialize/Deserialize for FFI reuse.

## Why it matters
One schema → both wire format and FFI payload; avoids drift.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `Cargo.toml`
