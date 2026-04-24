---
name: content-types-knowledge-base-minified
type: knowledge
category: arch
summary: The full content-types KB ships as content_types_kb.min.json so APIs can offer rich metadata without a large overhead.
confidence: medium
tags: [magika, arch]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Content Types Knowledge Base Minified

## Fact

Distributing the comprehensive KB as minified JSON lets the CLI/APIs surface descriptions, MIME types, and extensions cheaply. Small enough to ship with every wheel/binary.

## Evidence

- `python/src/magika/magika.py:118-121`
