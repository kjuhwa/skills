---
name: published-vs-realtime-view-pages
description: PublishedViewPage renders a frozen deploy snapshot; RealTimeViewPage renders the live editable dashboard
type: arch
category: arch
source:
  kind: project
  ref: lucida-builder-r3@97ceb3a1
confidence: high
---

# Fact
Two top-level view pages coexist:

- `PublishedViewPage` — renders a deploy snapshot (datasources + pipelines + layer tree at the moment of deploy). Does **not** reflect subsequent edits.
- `RealTimeViewPage` — renders the current, live, Yorkie-synced dashboard the user is editing.

**Why:** Deploys exist precisely to give stakeholders a stable view decoupled from in-progress edits. Conflating the two would mean a demo link breaks the moment someone edits upstream.

**How to apply:**
- When adding a feature, ask: does it belong in "what's deployed" (snapshot-only) or "what's being edited" (live)?
- Data-freshness bugs on published dashboards are usually "snapshot is old, please redeploy", not a sync failure.
- New editing affordances (drawers, context menus, shortcuts) generally belong to `RealTimeViewPage` only.
