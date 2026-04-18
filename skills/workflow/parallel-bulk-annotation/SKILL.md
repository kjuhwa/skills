---
tags: [workflow, parallel, bulk, annotation]
name: parallel-bulk-annotation
description: 수십~수백 개 Java 파일에 어노테이션(@Schema, @Operation, @ApiResponse 등)을 대량 추가할 때 병렬 에이전트로 분산 실행하는 패턴
triggers:
  - 대량 어노테이션 추가
  - @Schema 전수 부여
  - operationId 전수 부여
  - 200개 메서드 어노테이션
  - bulk annotation
scope: user
category: workflow
version: 1.0.0
---

# 병렬 대량 어노테이션 패턴

수백 개의 Java 파일에 어노테이션을 추가할 때, 단일 에이전트는 중도 포기하거나 품질이 저하된다. 그룹별로 분산 배치한 병렬 executor 에이전트가 훨씬 안정적이고 빠르다.

## When to Activate

- 200+ @Operation, 500+ @Schema 등 대량 어노테이션 추가 요청
- 여러 컨트롤러/DTO에 동일한 패턴 반복 적용
- 단일 에이전트가 중도 실패(@ApiResponse 144/200만 완료하는 등)한 경험

## 핵심 원칙

1. **분산 단위: 파일 크기 × 어노테이션 수**
   - 작은 파일(~10 메서드): 5~8개씩 묶어서 1 에이전트
   - 큰 파일(50+ 메서드): 1 파일 = 1 에이전트 (예: CustomMonitorController)
   - 그룹당 ~50 어노테이션이 안전 상한

2. **명시적 매핑표 제공**
   - 단순히 "모든 @Operation에 operationId 추가"가 아니라
   - 메서드명 → 제안 operationId 전수 매핑표 전달
   - 에이전트가 고민하지 않도록 이름까지 미리 결정

3. **run_in_background: true**
   - 병렬 실행을 위해 필수
   - 동시 5개 에이전트 디스패치, 완료 알림 대기

4. **완료 후 grep 검증**
   - 각 에이전트의 자기보고는 신뢰하되 검증
   - `grep -rn 'operationId' ... | wc -l` 로 전체 카운트 확인
   - 누락된 컨트롤러는 후속 에이전트로 보충

## 디스패치 템플릿

```
Agent({
  description: "operationId - {group}",
  subagent_type: "oh-my-claudecode:executor",
  run_in_background: true,
  name: "operationId-{group}",
  prompt: `Add operationId to every @Operation annotation in these N controller files.

Rules:
- Only add operationId, do NOT change any existing fields
- Read each file first, then add operationId to every @Operation
- camelCase verb+noun pattern (1~128 chars)

Files and suggested operationIds:

1. {absolute_path_1}
   - methodName1 → operationId = "verbNoun1"
   - methodName2 → operationId = "verbNoun2"
   ...

2. {absolute_path_2}
   ...

For each @Operation, add operationId as the first parameter:
  @Operation(summary = "...", ...)
  becomes:
  @Operation(operationId = "...", summary = "...", ...)`
})
```

## 검증 피드백 루프

단일 에이전트 실패 사례:
```
Phase 4 @ApiResponse 에이전트 결과:
- 144/200개만 완료
- MqttController, OperationController 등 6개 컨트롤러 누락
→ 누락된 6개만 전담하는 후속 에이전트 디스패치
→ 빌드 성공, 191/191 완료
```

핵심: **"전체 → 실패 → 재시도"보다 "부분 완료 → 갭 분석 → 보충"이 효율적**

## 안티 패턴

1. **금지: 혼자 모든 파일 편집** — Claude 자체 편집은 3~5 파일이 안전 상한
2. **금지: 프롬프트 없이 "알아서 해"** — 구체 매핑 제공 필수
3. **금지: 순차 대기** — 병렬 디스패치 후 완료 알림 수신
4. **금지: grep 없이 성공 선언** — 숫자로 검증

## 실측 성과 (Lucida SMS)

| 작업 | 에이전트 수 | 소요 시간 | 결과 |
|------|:-----------:|:---------:|:----:|
| operationId 200개 | 5 | ~5분 (병렬) | 100% 성공 |
| @ApiResponses 191개 | 1 → 보충 1 | ~15분 | 2단계로 완료 |
| @Schema 539개 (62파일) | 4 | ~5분 (병렬) | 100% 성공 |

단일 에이전트 예상치: 30~40분, 중도 실패 위험 높음.
