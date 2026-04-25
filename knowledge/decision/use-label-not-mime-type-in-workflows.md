---
version: 0.1.0-draft
name: use-label-not-mime-type-in-workflows
type: knowledge
category: decision
summary: Use Magika's stable label field (not MIME type or human description) for automation.
confidence: high
tags: [magika, decision]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Use Label Not Mime Type In Workflows

## Fact

MIME types and verbose descriptions drift across versions and tools (e.g. Markdown moved from text/x-markdown to text/markdown; PE binaries moved MIME). Magika's label values are immutable strings ('python', 'pdf') and are the only reliable field for backwards-compatible pipelines.

## Evidence

- `website-ng/src/content/docs/additional-resources/faq.md:35-65`
