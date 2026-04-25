---
version: 0.1.0-draft
name: numpy-unpinned-no-workaround
type: knowledge
category: decision
summary: Magika unpinned numpy because pip's resolver already handles Python-version compatibility automatically.
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

# Numpy Unpinned No Workaround

## Fact

An earlier version pinned numpy to support Python 3.8, but the constraint was redundant — numpy declares python_requires in its metadata and pip discards incompatible versions on its own. The unpin reduces maintenance burden with no functional regression.

## Evidence

- `commit 2e6742c`
- `https://iscinumpy.dev/post/bound-version-constraints/`
