---
name: dxgi-com-pointer-wrapper-raii
description: Custom ComPtr<T> with Drop-based COM reference counting for DXGI objects.
category: patterns
version: 1.0.0
version_origin: extracted
tags: [com, dxgi, patterns, pointer, raii, wrapper]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: libs/scrap/src/dxgi/mod.rs
imported_at: 2026-04-19T00:00:00Z
---

# Dxgi Com Pointer Wrapper Raii

## When to use
Custom ComPtr<T> with Drop-based COM reference counting for DXGI objects.

## Source context
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- Demonstrated in: `libs/scrap/src/dxgi/mod.rs`

## Why this generalizes
Reusable for Windows COM interop in Rust.

## Next steps before publishing
- Read the source files above and rewrite this as a product-agnostic `how-to` — keep the pattern, drop rustdesk-specific names.
- Add a minimal code example in the target language (Rust + Dart / Rust only / etc.).
- List 2-3 gotchas you hit while reproducing it.
