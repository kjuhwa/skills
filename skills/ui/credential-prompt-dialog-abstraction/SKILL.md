---
name: credential-prompt-dialog-abstraction
description: Credential dialog abstraction across platforms via ui_interface::msgbox callback.
category: ui
version: 1.0.0
version_origin: extracted
tags: [abstraction, credential, dialog, prompt]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/port_forward.rs
imported_at: 2026-04-19T00:00:00Z
---

# Credential Prompt Dialog Abstraction

## When to use
Credential dialog abstraction across platforms via ui_interface::msgbox callback.

## Source context
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- Demonstrated in: `src/port_forward.rs`

## Why this generalizes
Generic callback-based UI prompt pattern.

## Next steps before publishing
- Read the source files above and rewrite this as a product-agnostic `how-to` — keep the pattern, drop rustdesk-specific names.
- Add a minimal code example in the target language (Rust + Dart / Rust only / etc.).
- List 2-3 gotchas you hit while reproducing it.
