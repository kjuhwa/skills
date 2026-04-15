---
name: yorkie-team-server-split
description: Yorkie holds live canvas state; the team server holds metadata (projects, assets, datasources) — never mix
type: arch
category: arch
source:
  kind: project
  ref: lucida-builder-r3@97ceb3a1
confidence: high
---

# Fact
In the Lucida Builder, the Yorkie server owns realtime collaborative canvas state; the team (backend) server owns all non-realtime metadata — finder entries, project list, asset registry, datasource/pipeline list, deployed-dashboard snapshots.

**Why:** CRDT sync only makes sense for concurrently edited canvas state. Putting list metadata in Yorkie would force every list query through the doc and forfeits the server's transactional guarantees. Conversely, putting canvas state on the team server loses realtime merge.

**How to apply:**
- When adding a new entity, decide **first** which server owns it, then pick the state mechanism.
- Finder, LeftSideBar asset/datasource lists, RightSideBar deploy list → team server REST.
- Canvas node tree, per-node attributes, component-edit drawer settings → `doc.update` / pull helpers.
- Don't route metadata reads through Yorkie just because the UI that shows them is "inside" the builder.

## Evidence
- `builder-ui/.claude/architecture.md` §4 sync diagram and §7 rule 2 ("팀 서버 ≠ Yorkie 서버").
- LeftSideBar/RightSideBar mapping table in the same doc.
