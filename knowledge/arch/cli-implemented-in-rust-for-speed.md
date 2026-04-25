---
version: 0.1.0-draft
name: cli-implemented-in-rust-for-speed
type: knowledge
category: arch
summary: The Magika CLI is Rust, not Python, to eliminate interpreter startup overhead.
confidence: high
tags: [magika, arch]
linked_skills: [python-rust-client-fallback-with-warning]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Cli Implemented In Rust For Speed

## Fact

The original Python CLI took several hundred ms just to start. The Rust CLI starts near-instantly, which matters for shell scripting and batch use. The Python package ships the precompiled Rust binary in platform wheels (with a pure-Python fallback for unsupported platforms).

## Evidence

- `python/README.md:38-39`
- `website-ng/src/content/docs/additional-resources/faq.md:27-32`
