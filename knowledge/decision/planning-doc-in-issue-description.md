---
version: 0.1.0-draft
name: planning-doc-in-issue-description
description: For AI pipelines that read planning docs from issue trackers, favor putting the full markdown in the issue description over wiki-link indirection
category: decision
source:
  kind: project
  ref: polestar10-auto-pipeline@b0f1c9d
confidence: medium
linked_skills: []
tags: [issue-tracker, planning-doc, redmine, ai-ingestion, single-source]
---

**Fact:** Issue trackers like Redmine offer two places to keep planning docs: issue description, or a wiki page linked from the issue. For AI skills that fetch the doc, inline description wins: one API call (`get_issue(full_description=true)`) delivers the full text in markdown; parent/child task linkage is native; issue status tracks planning-doc lifecycle. Wiki adds a hop (parse link → fetch wiki), often uses a non-markdown syntax (Textile), and fragments status tracking across two objects.

The hybrid "short in description, long in wiki" option was rejected because the threshold is subjective and pipelines have to handle both paths.

**Why:** The cost of one extra API hop and a markup conversion outweighs the wiki's better editing UI, since planning docs are typically pasted from an external editor and edited rarely in-place. Single source of truth simplifies search prefixes (e.g. a `[spec]` subject tag) and sub-task wiring.

**How to apply:**
- Pick one canonical location for planning docs and enforce it; don't allow per-author variation.
- Standardize a subject prefix (`[spec]` / `[plan]`) so search is deterministic.
- Require a small metadata block at the top of the description (status, version, author, date) so AI can parse provenance without a separate source.
- Attach images as files + links rather than inlining them — keeps the markdown diffable.

**Evidence:**
- Internal planning-doc-on-tracker doc — option A (description) over B (wiki) / C (hybrid), with rationale.
