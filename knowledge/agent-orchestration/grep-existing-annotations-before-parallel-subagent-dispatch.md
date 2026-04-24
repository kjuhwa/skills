---
name: grep-existing-annotations-before-parallel-subagent-dispatch
version: 0.1.0-draft
description: "Before parallel-subagent dispatch for bulk annotation work, grep for existing markers so agents don't waste cycles re-verifying already-applied annotations"
title: "병렬 subagent 디스패치 전에 grep 으로 선행 작업 흔적을 확인하라 — 이미 적용된 annotation 을 다시 '검증'하느라 시간 낭비"
category: agent-orchestration / workflow
tags: [claude-code, subagent, parallel-dispatch, pre-check, pitfall, efficiency]
kind: pitfall
confidence: high
source_session: 2026-04-24
---

# 증상

Lucida `lucida-domain-sms` 에서 "SMS DTO 전수에 `@Schema(title, description, requiredMode)` 적용" 작업을 4개 executor subagent 로 병렬 위임:

- Agent 1 담당: dto 루트 24 파일
- Agent 2 담당: dto/configuration 7 파일
- Agent 3 담당: dto/custommonitor + custommonitortemplate 20 파일
- Agent 4 담당: dto/customscript 12 파일

총 63 파일, 수백 property. 각 agent 가 Read → 분석 → Edit → build 검증을 반복하며 **평균 100초 × 4 병렬** 소요.

**결과 (4개 agent 보고 집계)**:
- Agent 1: "수정 0파일 — 이미 모두 @Schema 적용됨"
- Agent 2: "수정 0파일 — 이미 모두 @Schema 적용됨"
- Agent 3: "수정 0파일 — 이미 모두 @Schema 적용됨"
- Agent 4: "수정 12파일 — title 보강 + example 추가"

= 3/4 agent 는 아무 것도 안 하고 끝. **수십초 × 3 = 1~2분 + token 낭비**.

# 원인

선행 issue #118871 "Swagger 최적화 sms V3" 에서 이미 대부분 DTO 에 `@Schema` 를 적용한 상태였다. 이 사실을 놓치고 "전수 적용" 이라는 문구만 보고 병렬 위임.

# 해결

병렬 dispatch **전에** 1초짜리 grep 한 번으로 선행 작업 여부 확인:

```bash
# 이미 적용된 @Schema 가 얼마나 있는지
grep -rln "@Schema" src/main/java/.../dto/ | wc -l

# DTO 파일 총수 대비 비율 계산
total=$(find src/main/java/.../dto/ -name "*.java" | wc -l)
hit=$(grep -rln "@Schema" src/main/java/.../dto/ | wc -l)
echo "coverage: $hit / $total = $((hit * 100 / total))%"

# git log 로 관련 작업 이력
git log --oneline --all | grep -iE "swagger|schema|annotation" | head
```

90%+ coverage 가 나오면 병렬 dispatch 대신:
- **sampling 검증만 delegate**: 1개 agent 로 미적용 파일만 찾아 report → 실제 edit 필요한 것만 후속 처리
- 또는 **단일 agent** 로 빠르게 스캔 + 보강

# 판단 기준

| grep 결과 | 전략 |
|---|---|
| coverage 0~20% | 원래대로 병렬 dispatch (작업량 큼) |
| 20~70% | 단일 agent 로 diff 파악 후 target dispatch |
| 70%+ | **sampling 만 / 병렬 금지** — race condition 과 무용한 compile 비용 |

# 관련 교훈

- **agent 작업 시작 전 전제 검증**: "이 파일이 현재 어떤 상태지?" 를 1초에 확인할 수 있으면 1분의 낭비 방지.
- **git log 활용**: 최근 commit 메시지에 "Swagger 최적화", "annotation", "@Schema" 같은 키워드가 있으면 선행 작업 존재 신호.
- **DTO 샘플 1개 직접 Read**: 대표 DTO 하나만 열어봐도 annotation 수준 즉시 판단 가능.

# 반례 (grep 으로 못 잡는 경우)

- Annotation 은 있으나 quality 가 낮음(`title` 만 있고 `description` 없음 등) → 이때는 병렬 dispatch 가 정당
- Lombok `@FieldNameConstants` 같이 compile-time 생성된 것 → grep 결과가 실제 annotation 밀도와 다를 수 있음

# 연결

- Parallel dispatch 패턴 자체는 skill `parallel-bulk-annotation` / `bucket-parallel-java-annotation-dispatch` 참조.
- 본 knowledge 는 **그 전에 pre-check 하라** 는 메타 규칙.
