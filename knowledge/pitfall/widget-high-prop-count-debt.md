---
version: 0.1.0-draft
tags: [pitfall, widget, high, prop, count, debt]
name: widget-high-prop-count-debt
category: pitfall
description: Dashboard CardChart components accumulate 100+ props making them hard to maintain, version, and test — known tech debt with no current mitigation
source:
  kind: project
  ref: lucida-ui@4b922a9043
---

# Widget Card High Prop Count Technical Debt

## Fact
CardChart and similar widget card components have accumulated 100+ props in their interface, including data props, configuration props, render props, and callbacks.

## Evidence
- `remotes/widget/src/components/commons/card/CardChart` — Props interface includes: `datas`, `type`, `title`, `customChartOptions`, `scatterOptions`, `renderTooltipIndividual`, `customRenderNameScatter`, `customDataBarChart`, plus 90+ more
- Each new widget feature adds more props rather than introducing options objects or composition patterns
- Multiple render props (`renderTooltipIndividual`, `customRenderNameScatter`) indicate the component tries to handle too many use cases

## Why this matters
- **Maintenance**: Changing one prop's type requires auditing 100+ prop consumers
- **Testing**: Combinatorial explosion of prop interactions makes thorough testing impractical
- **Onboarding**: New developers cannot understand the component's contract at a glance
- **Versioning**: Breaking changes are hard to detect when the prop surface is this wide

## Related TODOs found in codebase
- `GlobalTimeState` duplication between shared and APM remote
- `TimeGlobalSelector` mixed return type (function vs object)
- Brush interaction in `ItemForecastChart` — partial time mode sync implementation
- Menu configuration duplication (`AppMenuList` + `mainMenuConfig`)

## Potential mitigation (not yet applied)
- Split into options objects: `chartOptions`, `scatterOptions`, `renderOverrides`
- Use compound component pattern: `<CardChart><CardChart.Tooltip render={...} /></CardChart>`
- Extract domain-specific variants: `<CardLineChart>`, `<CardScatterChart>` with narrower interfaces
