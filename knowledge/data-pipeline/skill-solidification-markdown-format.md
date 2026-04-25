---
version: 0.1.0-draft
name: skill-solidification-markdown-format
summary: Skill format — YAML frontmatter plus markdown body with problem, mechanism, reuse sections
category: data-pipeline
confidence: high
tags: [evolver, data-pipeline, skill-format, reference]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - SKILL.md
imported_at: 2026-04-18T00:00:00Z
---

# Skill file format — YAML frontmatter + markdown

Evolver standardizes skills as markdown files with YAML frontmatter:

```yaml
---
name: <slug>
description: <one-line>
category: <bucket>
kind: skill | knowledge
confidence: high | medium | low
---
```

The body is plain markdown with three conventional sections: **Problem / Mechanism / Reuse**.

## Why this shape

- Human-readable and grep-able.
- Version-controllable (diffs stay tiny).
- Parseable by any tool that reads YAML headers (static site generators, linters, importers).
- Easy to hand-author *and* machine-generate from distillation pipelines.

## Reuse notes

Adopt the *minimum* frontmatter that your tooling needs — name, description, category, confidence. Add source_* fields if the content is imported from another repo so attribution survives as files move. Keep the section headers stable (Problem/Mechanism/Reuse) so downstream tooling can index them.
