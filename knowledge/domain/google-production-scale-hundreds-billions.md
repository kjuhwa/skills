---
version: 0.1.0-draft
name: google-production-scale-hundreds-billions
type: knowledge
category: domain
summary: Magika runs at Google scale, processing hundreds of billions of files weekly across Gmail, Drive, and Safe Browsing.
confidence: high
tags: [magika, domain]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Google Production Scale Hundreds Billions

## Fact

It's deployed as a security-pipeline filter routing files to appropriate scanners. The weekly volume validates the design at real production scale and explains why ~5ms inference time is non-negotiable.

## Evidence

- `README.md:23`
- `website-ng/src/content/docs/introduction/overview.md:13`
