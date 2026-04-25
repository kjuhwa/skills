---
version: 0.1.0-draft
name: overwrite-reason-field
type: knowledge
category: api
summary: MagikaPrediction.overwrite_reason indicates why the final label differs from the raw model prediction.
confidence: high
tags: [magika, api]
linked_skills: [overwrite-map-for-non-canonical-types]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Overwrite Reason Field

## Fact

The OverwriteReason enum tells callers whether the dl.label was replaced by output.label due to low confidence or an explicit overwrite_map rule. This is critical for any downstream automation that needs to distinguish 'the model said X with high confidence' from 'we fell back because the model wasn't sure'.

## Evidence

- `python/src/magika/magika.py:32-45`
- `website-ng/src/content/docs/cli-and-bindings/python.md:125-137`
