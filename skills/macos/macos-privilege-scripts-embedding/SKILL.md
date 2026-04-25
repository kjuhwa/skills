---
name: macos-privilege-scripts-embedding
description: Embed shell scripts via include_dir!() for privilege elevation + system operations.
category: macos
version: 1.0.0
version_origin: extracted
tags: [embedding, macos, platform, privilege, scripts]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/platform/macos.rs
imported_at: 2026-04-19T00:00:00Z
---

# Macos Privilege Scripts Embedding

## When to use
Embed shell scripts via include_dir!() for privilege elevation + system operations.

## Source context
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- Demonstrated in: `src/platform/macos.rs`

## Why this generalizes
Reusable pattern for shipping helper scripts inside a Rust binary.

## Next steps before publishing
- Read the source files above and rewrite this as a product-agnostic `how-to` — keep the pattern, drop rustdesk-specific names.
- Add a minimal code example in the target language (Rust + Dart / Rust only / etc.).
- List 2-3 gotchas you hit while reproducing it.
