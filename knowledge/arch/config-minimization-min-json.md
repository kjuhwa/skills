---
version: 0.1.0-draft
name: config-minimization-min-json
type: knowledge
category: arch
summary: Model configs ship as config.min.json (minified) to shrink package size — especially important for browser deployment.
confidence: medium
tags: [magika, arch]
linked_skills: [model-config-min-json-compact-format]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Config Minimization Min Json

## Fact

Minification removes whitespace, comments, and unnecessary metadata. The .min suffix is a convention for distributable artifacts. Browser bundles in particular benefit from this — load time is dominated by transfer size.

## Evidence

- `python/src/magika/magika.py:95`
