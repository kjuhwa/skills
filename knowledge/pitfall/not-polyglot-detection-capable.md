---
version: 0.1.0-draft
name: not-polyglot-detection-capable
type: knowledge
category: pitfall
summary: Magika does NOT detect polyglot files (files valid as multiple types simultaneously, e.g. ZIP-in-JPEG).
confidence: high
tags: [magika, pitfall]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Not Polyglot Detection Capable

## Fact

Polyglots are intentionally crafted to be valid in multiple formats. Magika detects only the dominant type via byte sampling. The team explicitly does not target polyglot detection as a first-release goal and invites adversarial examples to drive future improvements.

## Evidence

- `website-ng/src/content/docs/contributing/known-limitations.md:7`
