---
version: 0.1.0-draft
name: model-version-compatibility-major-version
type: knowledge
category: version-quirk
summary: Major model version bumps (v1 → v2 → v3) change the output space and are not transparently backwards-compatible.
confidence: medium
tags: [magika, version-quirk]
linked_skills: [model-config-versioning-and-backwards-compat]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Model Version Compatibility Major Version

## Fact

v1 had ~100 types; v2_1 expanded to 200+. A binding pinned to one model version may not understand new types from a later one. When upgrading bindings, verify which model version they ship with — the output space may have grown.

## Evidence

- `assets/models/CHANGELOG.md:1-50`
- `website-ng/src/content/docs/core-concepts/models-and-content-types.md:4-17`
