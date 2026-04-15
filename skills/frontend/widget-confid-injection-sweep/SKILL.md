---
name: widget-confid-injection-sweep
description: 리소스 상세 대시보드에서 모든 위젯 데이터 요청에 `confId` 를 일관되게 주입하기 위한 위젯 fetch 지점 전수 스윕(sweep) 패턴 — 일부만 주입하면 같은 대시보드 안에서 위젯별 필터 동작이 갈라지는 버그를 방지한다.
category: frontend
tags: [widget, dashboard, resource-detail, data-fetch, scope-injection]
triggers:
  - confId 주입
  - selectCondition confId
  - 위젯 필터링
  - widget scope injection
  - resource-scoped widget
version: 1.0.0
---

# Widget confId Injection Sweep

## Purpose

리소스 상세 "요약" 대시보드에서 위젯이 전체 대시보드가 아니라 **해당 리소스 한정** 데이터를 표시하도록, 모든 위젯의 데이터 요청 payload 에 `confId` 를 조건부로 주입한다. 한 곳만 놓치면 다른 위젯은 리소스 필터가 먹히지만 그 위젯만 전체 데이터가 보이는 사일런트 버그가 발생한다.

## When to Activate

- 리소스 상세 요약 대시보드 신규 구축/보강
- "같은 화면인데 위젯 하나만 다른 리소스 데이터가 나온다" 증상
- 새 위젯 종류 추가 후 주입 누락 점검

## 주입 패턴

`GridLayoutPage` 에 `pageProps.selectCondition.confId` 를 흘려보내고, 각 위젯 fetch 지점에서 다음 템플릿으로 파라미터에 조건부 병합:

```ts
...((pageProps?.selectCondition as any)?.confId
    ? { confId: (pageProps.selectCondition as any).confId }
    : {}),
```

- 대시보드 모드(일반 위젯 조회)에서는 `selectCondition` 이 없으므로 자동 noop
- 리소스 상세 모드일 때만 `confId` 가 포함되어 서버 필터가 적용

## 주입 지점 (전수 sweep)

신규 위젯을 추가할 때마다 아래 유형 전부 훑을 것.

```
차트
- WidgetCreatePreview.tsx                 (단일 차트 미리보기)
- fetchSpeedChartData.ts
- fetchEqualizerChartData.ts
- fetchCylinderChartData.ts
- (기타 fetch<ChartType>Data.ts)

카드
- CardWidgetCard.tsx
- CardNetworkInterface.tsx
- TickerPreviewCard.tsx
- TopNPreviewItem.tsx
- useCardAvailability.tsx

테이블 / TopN
- CardTable.tsx
- useWidgetTableGrid.tsx

게이지
- useGaugeFetchData.ts
```

## 검증 방법

```
1. grep 으로 위젯 fetch 훅/컴포넌트 전수 나열:
     rg "makeServerSideParams|fetch.*ChartData|useCard|useGauge|useWidget"
2. 각 fetch 지점에 confId 분기 존재 여부 확인
3. 네트워크 탭에서 대시보드 로드 시 모든 위젯 요청에 confId 쿼리/바디 포함 확인
4. 같은 대시보드 위젯이지만 confId 가 빠진 요청이 있으면 회귀
```

## Pitfalls

- **옵셔널 체이닝 생략**: `pageProps.selectCondition.confId` 처럼 직접 접근하면 일반 대시보드에서 NPE — 반드시 옵셔널 체이닝 + 조건부 spread
- **일부 위젯만 반영**: "화면에 안 보이는 위젯" (토글·접힘 상태) 도 반드시 같이 수정
- **타입 캐스팅 남용**: 급한 대로 `as any` 를 쓰더라도 selectCondition 공용 타입에 `confId?: string` 를 정식 추가하는 게 장기적으로 안전

## Checklist

- [ ] GridLayoutPage 에 selectCondition.confId 전달
- [ ] 위에 나열된 모든 fetch 지점에 조건부 주입 완료
- [ ] 신규 위젯 종류 추가 PR 에 주입 1줄 포함
- [ ] selectCondition 공용 타입에 `confId?: string` 선언 (장기)
- [ ] DevTools 에서 리소스 상세 대시보드 요청 전수 confId 포함 확인
