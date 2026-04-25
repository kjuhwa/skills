---
version: 0.1.0-draft
name: synthetic-utf8-datasets-v3-3
type: knowledge
category: arch
summary: standard_v3_3 added synthetic UTF-8 datasets (non-ASCII text, JSON) to improve international/multilingual handling.
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

# Synthetic Utf8 Datasets V3 3

## Fact

ASCII-only training data fails on UTF-8 text with non-ASCII codepoints — the model treats high bytes as 'maybe binary'. Adding synthetic UTF-8 corpora for simple text and JSON closed that gap in v3_3.

## Evidence

- `assets/models/CHANGELOG.md:7-12`
