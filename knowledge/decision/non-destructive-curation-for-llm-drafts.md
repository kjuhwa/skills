---
version: 0.1.0-draft
name: non-destructive-curation-for-llm-drafts
description: For pipelines that auto-generate hundreds of LLM drafts, prefer reversible ratings (👍/⭐/👎) with persistent state over immediate deletion; expose a single explicit "Delete 👎" batch action for destructive cleanup.
category: decision
tags:
  - ux
  - curation
  - llm
  - pipeline
---

# non-destructive-curation-for-llm-drafts

## Context

The trending-hub-loop auto-imports GitHub trending repos and produces 20–70 skill/knowledge drafts per cycle. After a few days there were 500+ drafts — too many to review in one sitting, with mixed quality. The question: how should the reviewer mark a bad draft?

## Options considered

1. **Immediate delete on 👎.** Simple, obvious. Rejected: a reviewer who misclicks loses the draft permanently, and re-reading later can't change their mind.
2. **Move to a hidden `_rejected/` folder.** Less destructive. Rejected: hides the judgment from future curation, and adds a fourth state (draft / published / starred / rejected) to the filesystem that other commands must know about.
3. **In-memory ratings with a separate `.curation.json`.** Chosen.

## Decision

- Ratings live in `.curation.json` as `${kind}::${category}::${name} → -1|1|2`.
- Tiles show visual state (green/amber/red border) based on rating.
- Filters (`👍 / ⭐ / 👎 / Unrated`) compose with category tabs for triage.
- **Delete** is a separate, explicit batch action (`🗑 Delete 👎` button with confirm). Only runs when the reviewer asks — never implicit.

## Why this works

- **Reversible by default.** A 👎 click costs nothing; un-click restores.
- **History preserved.** Even after `Delete 👎`, the curation file remembers what was rejected so re-runs don't re-stage identical drafts under the same name.
- **Batch action surface.** Cleaning up is one button, not 50 individual deletes.
- **Data model matches the mental model.** "I think this is bad / great / meh" is a judgment, not a filesystem operation.

## Applies when

Any pipeline that produces a large queue of items where quality is known only by human review: LLM outputs, scraped leads, PR candidates, generated tests. If the item count is small and quality is binary, delete-on-click is fine.
