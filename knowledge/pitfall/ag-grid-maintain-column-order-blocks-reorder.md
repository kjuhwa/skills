---
version: 1.0.0
name: ag-grid-maintain-column-order-blocks-reorder
description: AG-Grid `maintainColumnOrder={true}` 는 setColumnDefs/applyColumnState 로 주입한 순서 변경을 무시한다 — 뷰 기반 persist 화면에서는 false 로 전환 필수
category: pitfall
tags:
  - ag-grid
  - maintainColumnOrder
  - applyColumnState
  - setColumnDefs
  - column-personalization
source_project: lucida-ui
---

# ag-grid-maintain-column-order-blocks-reorder

## 증상
사용자가 컬럼 개인화 다이얼로그에서 컬럼 순서를 드래그로 바꾸고 저장 → `setColumnDefs(next)` 로 새 배열을 주입해도 그리드 순서가 바뀌지 않는다. 이후 `applyColumnState({state, applyOrder:true})` 를 추가로 호출해도 반영되지 않는 케이스 발생.

## 원인
- AG-Grid 의 `maintainColumnOrder: true` 는 "columnDefs prop 이 바뀌어도 사용자가 보고 있던 컬럼 순서를 유지" 가 목적의 옵션이다.
- `setColumnDefs` (실제로는 `api.setGridOption('columnDefs', ...)`) 가 들어오면 AG-Grid 는 기존 순서 기준으로 컬럼을 merge 하므로 새 배열의 순서는 버려진다.
- 10초마다 LIVE 리프레시 / 부모 re-render 가 `columnDefs` prop 을 다시 넘기면 원본 순서로 되돌아간다.

## 회피
1. 화면에서 저장된 사용자 뷰가 곧 그리드 순서인 경우 — `maintainColumnOrder={false}` 로 전환한다.
2. 부모가 넘기는 `columnDefs` 자체를 view 적용 버전으로 미리 sort 해 전달한다 (`applyViewToColumnDefs(cols, view)` 의 리턴값). 매 렌더마다 새 배열이어도 view 기준 순서가 유지됨.
3. 드래그 즉시 persist: drop 이벤트에서 `patchColumns({columns:[{key, order:i}]})` 를 100ms 디바운스로 호출 → 다음 refresh 이전에 `activeView.mtime` 갱신 → 재계산이 같은 순서를 유지.

## 판단 기준
- 유지 OK(`true` 권장): 사용자가 매 세션마다 수동으로 드래그해 임시 정렬하는 화면 (저장 없음).
- 끄기(`false` 필수): 뷰 기반 persist 가 있는 화면 (예: lucida-ui 알람/이벤트 현황).

## 참고
AG-Grid 문서: `maintainColumnOrder` 는 columnDefs 재주입 시 사용자 순서 보존 옵션. persist 가 바뀐 순서를 "사용자 의도" 로 삼는 화면에서는 이 옵션이 의도와 정반대로 작동하므로 반드시 끈다.
