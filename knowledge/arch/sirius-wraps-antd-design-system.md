---
version: 0.1.0-draft
tags: [arch, sirius, wraps, antd, design, system]
name: sirius-wraps-antd-design-system
category: arch
description: Sirius design system wraps Ant Design components instead of replacing them — rationale, extension pattern, and upgrade implications
source:
  kind: project
  ref: lucida-ui@4b922a9043
---

# Sirius Wraps Ant Design

## Decision
The Sirius design system (`packages/sirius/`) wraps every Ant Design component (Card, Collapse, Tabs, Button, Modal, Drawer, Grid) with a thin custom layer rather than building from scratch.

## Rationale
- **Stability**: Ant Design is mature with wide feature coverage — reimplementing would be costly and error-prone
- **Consistency**: Custom props (`standardLayout`, `padding`, `size`, `width`) enforce company design standards at the wrapper level
- **Compatibility**: All original Ant props pass through via `...rest` spread — consumers can use any Ant feature
- **Upgrade path**: Ant Design upgrades only require updating the wrapper layer, not every consumer

## Pattern
```
Ant Design component (e.g., AntCard)
  → Sirius wrapper (extends props, injects classNames)
    → Consumer imports from @design-system, never from antd directly
```

## Evidence
- `packages/sirius/src/components/data-display/card/Card.tsx` — wraps AntCard
- `packages/sirius/src/components/data-display/collapse/Collapse.tsx` — wraps AntCollapse
- `packages/sirius/src/components/data-display/tabs/Tabs.tsx` — wraps AntTabs + adds DnD
- `packages/sirius/src/components/data-display/grid/Grid.tsx` — wraps ag-grid Enterprise
- Layout components (Layout_h1, h2, h3, v1, v2, v3) — custom, not Ant-based

## Implication
- Host wraps with `StyleProvider` (`hashPriority="high"`) for Ant CSS-in-JS priority
- Compound sub-components (Tabs.TabPane, Collapse.Panel) must be re-exported as static properties
- Design token enforcement happens via `classNames` in the wrapper, not in Ant's theme config
