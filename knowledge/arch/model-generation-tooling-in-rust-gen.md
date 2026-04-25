---
version: 0.1.0-draft
name: model-generation-tooling-in-rust-gen
type: knowledge
category: arch
summary: rust/gen/ contains code generators for new model versions — sync.sh and publish.sh automate the propagation.
confidence: medium
tags: [magika, arch]
linked_skills: [generated-enum-and-config-code-from-json-schema]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Model Generation Tooling In Rust Gen

## Fact

When a new model lands, rust/gen regenerates Rust bindings (content.rs with thresholds and metadata, model.rs). This guarantees model updates propagate consistently to all language bindings — no hand-editing per binding.

## Evidence

- `rust/README.md:6-11`
