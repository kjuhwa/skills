---
version: 1.0.0
name: sirius-grid-events-top-level-not-gridoptions
description: Sirius `<Grid>` 는 이벤트 핸들러를 top-level prop 으로 노출한다 — gridOptions 에 넣으면 호출되지 않는다
category: pitfall
tags:
  - ag-grid
  - sirius
  - lucida-ui
  - onColumnMoved
  - gridOptions
source_project: lucida-ui
---

# sirius-grid-events-top-level-not-gridoptions

## 증상
AG-Grid 공식 문서 방식대로 `onColumnMoved` · `onColumnResized` · `onSortChanged` 등을 `gridOptions` 에 넣어도 이벤트가 발화되지 않는다. 그리드 드래그·리사이즈·정렬 시 훅이 실행되지 않아 persist 가 시작되지 않는다.

## 원인
`packages/sirius/src/components/data-display/grid/Grid.tsx` 는 각 이벤트를 컴포넌트 props 로 직접 선언 (예: `onColumnMoved?: (e: ColumnMovedEvent) => void`) 한 뒤 내부에서 AG-Grid 에 전달한다. `gridOptions` 로 들어온 핸들러는 그 경로를 타지 않아 버려진다.

## 정답
```tsx
<GridScroll
    gridOptions={{ rowSelection: 'multiple', getRowStyle }}
    onColumnMoved={handler}
    onGridReady={onGridReady}
    relAgGridProps={{ onColumnResized, onSortChanged, onFilterChanged }}
/>
```
- `onColumnMoved`, `onGridReady` 등은 sirius 가 직접 노출하는 top-level prop.
- sirius 가 직접 노출하지 않는 나머지 AG-Grid 이벤트는 `relAgGridProps={{ ... }}` 로 pass-through 한다.

## 함정 변형
- `GridScroll` 내부에서 `{ ...gridOptions }` 를 확장해 주지만, AG-Grid 자체가 **gridOptions 경로의 이벤트 콜백을 무시** 하거나 sirius 가 중간에서 덮어쓰는 경우가 있어 동작이 갈린다.
- 디버깅: handler 실행 여부가 의심되면 먼저 `console.log` 를 심어 본다. 실행 안 되면 props 경로로 옮긴다.

## 체크리스트
1. 이벤트가 호출되는지 console.log 로 확인.
2. 호출 안 되면 top-level prop 으로 옮긴다.
3. sirius 가 직접 지원하지 않는 이벤트는 `relAgGridProps` 에 넣는다.
