---
version: 0.1.0-draft
name: no-finer-grained-metadata
type: knowledge
category: pitfall
summary: Magika returns broad content-type labels — no finer-grained metadata (e.g. ELF static-vs-dynamic, PDF version).
confidence: medium
tags: [magika, pitfall]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# No Finer Grained Metadata

## Fact

All ELF binaries → 'elf'. All PDFs → 'pdf'. By design — Magika is a high-level filter for security pipelines, not a detailed analyzer. If you need finer detail, run a specialized parser after Magika triages.

## Evidence

- `website-ng/src/content/docs/additional-resources/faq.md:70-78`
