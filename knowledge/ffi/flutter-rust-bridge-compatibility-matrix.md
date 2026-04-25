---
version: 0.1.0-draft
name: flutter-rust-bridge-compatibility-matrix
type: knowledge
category: ffi
summary: flutter_rust_bridge v1.80 requires Rust edition 2021 and has platform-specific build tweaks for each target.
confidence: high
tags: [bridge, compatibility, ffi, flutter, matrix, rust]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: [Cargo.toml, src/flutter_ffi.rs]
imported_at: 2026-04-19T00:00:00Z
---

# Flutter Rust Bridge Compatibility Matrix

## Fact
flutter_rust_bridge v1.80 requires Rust edition 2021 and has platform-specific build tweaks for each target.

## Why it matters
Mismatched FRB versions produce cryptic codegen errors; pin FRB version in Cargo.toml and CI.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `Cargo.toml`
- `src/flutter_ffi.rs`
