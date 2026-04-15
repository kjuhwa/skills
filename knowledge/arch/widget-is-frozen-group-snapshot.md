---
name: widget-is-frozen-group-snapshot
description: Widgets are snapshots of a group at save time; later edits to the source group do not propagate
type: arch
category: arch
source:
  kind: project
  ref: lucida-builder-r3@97ceb3a1
confidence: high
---

# Fact
A "위젯 (widget)" in the builder is a stored snapshot of a Group layer (with its children). Dropping a widget on a canvas inserts the saved layer tree as-is. Editing the original group later does **not** update previously-inserted widget instances.

**Why:** Widgets are intended for cross-project reuse of a layout, not for live templating. Live propagation would couple unrelated projects and violate the "배포된 대시보드 = frozen snapshot" invariant.

**How to apply:**
- Don't design features that assume widget → source linkage.
- Bug reports like "I updated the widget but old dashboards still show old content" are **by design**; direct the user to re-insert.
- Related: deployed dashboards (`PublishedViewPage`) are also frozen snapshots; the live version lives in `RealTimeViewPage`.

## Evidence
- `builder-ui/.claude/architecture.md` §6 "위젯 레이어" table and "배포 개념" table.
- Initial widget commit `cda70b63` (#72).
