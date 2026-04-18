---
version: 0.1.0-draft
tags: [pitfall, legacy, datasource, naming]
name: legacy-datasource-naming
description: "`dataSource` / `dataSourceFilter` in the codebase actually mean data-pipeline-select and data-pipeline-filter — not datasource"
type: pitfall
category: pitfall
source:
  kind: project
  ref: lucida-builder-r3@97ceb3a1
confidence: high
---

# Fact
In `builder-ui`, the identifiers `dataSource` and `dataSourceFilter` in the component-edit Drawer tabs are **legacy names**. They actually refer to:

- `dataSource` → "데이터 파이프라인 선택" (pipeline selection + header/body/params/period settings)
- `dataSourceFilter` → "데이터 파이프라인 필터" (mapping JSON + filter function + validation preview)

Real datasources are a separate concept owned by `lucida-builder-datasource` and surfaced in the LeftSideBar.

**Why:** The tabs were named before the "datasource vs pipeline" split crystallized. Renaming to `dataPipeline` / `dataPipelineFilter` is intended but not done yet, and touching every call site at once is expensive.

**How to apply:**
- When a bug report mentions "datasource tab", confirm whether the user means the LeftSideBar datasource list or the drawer's pipeline-selection tab.
- When reading code, treat `dataSource` inside drawer/tab context as pipeline-select; inside LeftSideBar/finder context as the real datasource.
- Do not coin a third name; either keep `dataSource` or migrate to `dataPipeline` consistently.

## Evidence
- `builder-ui/.claude/architecture.md` §6 table "컴포넌트 편집 Drawer".
