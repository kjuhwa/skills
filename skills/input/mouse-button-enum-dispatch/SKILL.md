---
name: mouse-button-enum-dispatch
description: Enum-based mouse event handling (left, right, wheel, back) with callback routing.
category: input
version: 1.0.0
version_origin: extracted
tags: [button, dispatch, enum, input, mouse]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: flutter/lib/models/input_model.dart
imported_at: 2026-04-19T00:00:00Z
---

# Mouse Button Enum Dispatch

## When to use
Enum-based mouse event handling (left, right, wheel, back) with callback routing.

## Source context
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- Demonstrated in: `flutter/lib/models/input_model.dart`

## Why this generalizes
Clean pattern vs. chained if/else for input events.

## Next steps before publishing
- Read the source files above and rewrite this as a product-agnostic `how-to` — keep the pattern, drop rustdesk-specific names.
- Add a minimal code example in the target language (Rust + Dart / Rust only / etc.).
- List 2-3 gotchas you hit while reproducing it.
