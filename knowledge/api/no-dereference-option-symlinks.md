---
version: 0.1.0-draft
name: no-dereference-option-symlinks
type: knowledge
category: api
summary: no_dereference=True (--no-dereference in CLI) treats symlinks as type 'symlink' instead of following them.
confidence: medium
tags: [magika, api]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# No Dereference Option Symlinks

## Fact

Default behavior follows symlinks and reports the linked file's type. Setting no_dereference inspects the symlink itself. Useful when you care about filesystem metadata (e.g. detecting suspicious symlinks during forensics).

## Evidence

- `python/src/magika/magika.py:57-61`
- `python/README.md:122-124`
