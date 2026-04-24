---
version: 1.0.0
name: ag-grid-displayed-columns-include-action-columns
description: AG-Grid `getAllDisplayedColumns()` 는 checkbox·action 컬럼까지 반환한다 — 서버 카탈로그 key 로 화이트리스트 필터 필수
category: pitfall
tags:
  - ag-grid
  - getAllDisplayedColumns
  - action-column
  - column-personalization
  - whitelist
source_project: lucida-ui
---

# ag-grid-displayed-columns-include-action-columns

## 증상
`onColumnMoved` 에서 `event.api.getAllDisplayedColumns()` 로 현재 순서를 읽어 `patchColumns` 로 서버에 저장 → BE 가 `INVALID_COLUMN_KEY` 를 던진다 (lucida-alarm 에서는 `POLESTAR_01414`).

## 원인
AG-Grid 의 `getAllDisplayedColumns()` 는 모든 표시 컬럼을 반환한다:
- 실제 데이터 필드 (`alarmSeverity`, `cTimestamp` 등)
- 체크박스 컬럼 (colId 가 `ag-Grid-SelectionColumn` 등)
- action 컬럼 (`field: 'delete'` 같은 cell renderer 전용 정의)

이 모두를 그대로 BE 로 보내면 카탈로그에 없는 key 때문에 **전체 요청이 reject** 된다 — 일부만 저장되지 않고 트랜잭션 자체가 실패.

## 회피
patch 호출 전 **허용 키 집합** 으로 필터링한다. 허용 집합은 `activeView.columns[].key` 또는 `catalog.columns[].key` 를 사용 (둘 다 BE 카탈로그 기준).

```ts
export const useGridMovePatcher = (
    viewId: string | undefined,
    allowedKeys?: string[] | Set<string>,
) => {
    const allowedRef = useRef<Set<string>>(new Set())
    useEffect(() => {
        allowedRef.current = allowedKeys instanceof Set
            ? allowedKeys
            : new Set(allowedKeys ?? [])
    }, [allowedKeys])

    return (event) => {
        const cols = event.api.getAllDisplayedColumns() ?? []
        const allowed = allowedRef.current
        const filtered = allowed.size
            ? cols.filter((c) => allowed.has(c.getColId()))
            : cols
        // ...patch with filtered
    }
}
```

## 체크리스트
- activeView 의 columns 길이만큼만 POST 되는지 network tab 확인.
- `delete`, `ag-Grid-SelectionColumn` 등 기술 컬럼이 payload 에 없는지 확인.
- BE 응답 200. 에러코드 사라짐.
