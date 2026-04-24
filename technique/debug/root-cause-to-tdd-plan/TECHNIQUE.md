---
version: 0.1.0-draft
name: root-cause-to-tdd-plan
description: Bug report → systematic root-cause investigation → classified fix path → GitHub issue with TDD test plan
category: debug
tags:
  - debug
  - root-cause
  - triage
  - tdd
  - github-issue
  - decision-tree

composes:
  - kind: skill
    ref: debug/investigate
    version: "^1.0.0"
    role: phase-orchestrator
  - kind: skill
    ref: debug/build-error-triage
    version: "^1.0.0"
    role: branch-build-error
  - kind: skill
    ref: debug/triage-issue
    version: "*"
    role: artifact-producer
  - kind: knowledge
    ref: pitfall/ai-guess-mark-and-review-checklist
    version: "*"
    role: hypothesis-guard

binding: loose

verify:
  - "composes[].ref 모두 허브에 설치됨"
  - "composes[].version range 가 설치본과 교차"
  - "decision tree의 모든 종단이 GitHub 이슈 또는 명시적 non-fix 결정으로 귀결"
---

# Root Cause → TDD Fix Plan

> 에러/버그 신고에서 시작해 **체계적 근본 원인 조사 → 원인 분류에 따른 경로 분기 → GitHub 이슈 + TDD 테스트 계획** 까지 가는 결정트리. 원인이 명확하지 않은 장애를 받아 fix 계획까지 안전하게 끌고 가기 위한 레시피.

## When to use

- 증상은 있으나 원인이 불명확한 버그/장애 신고
- 근본 원인 없이 패치해버리는 함정을 피해야 하는 상황
- 결과물로 **TDD 계획이 포함된 GitHub 이슈**가 필요할 때

## When NOT to use

- 원인이 자명한 1줄 수정 (오버헤드만 크다)
- 배포 중 핫픽스 — 이 technique은 조사 우선이라 느리다
- 재현 불가능한 일회성 장애 (별도 triage 패턴)

## Decision tree (파일럿 1과 달리 선형 아님)

```
[bug report]
    │
    ▼
┌─────────────────────────────────────────────┐
│ skill: debug/investigate  (phase-orchestrator) │
│ 4-phase loop: investigate → analyze →       │
│ hypothesize → implement                      │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴───────┐
       │ hypothesize   │  ←── knowledge: ai-guess-mark-and-review-checklist
       │ phase         │       (hypothesis-guard: 추측을 표식하고 재검토)
       └───────┬───────┘
               │ root cause classified
               │
       ┌───────┴────────────────────┐
       ▼                            ▼
 [build/compile error]         [runtime/logic bug]
       │                            │
       ▼                            ▼
 skill: debug/build-error-triage    skill: debug/triage-issue
 (branch-build-error)               (artifact-producer)
       │                            │
       └──────────────┬─────────────┘
                      ▼
         [GitHub issue + TDD test plan]
```

## Glue summary (technique의 순부가가치)

구성 원자는 각각 독립적으로 존재한다. 이 technique이 **유일하게 추가**하는 것:

| 추가 요소 | 위치 |
|---|---|
| 원자 간 라우팅 규칙 (build-error vs runtime-bug) | hypothesize phase 종료 시점 |
| `investigate` hypothesize → `triage-issue` 승격 조건 | "근본 원인이 식별됨 AND 수정 범위가 명확" |
| `ai-guess-mark-and-review-checklist` 적용 시점 | hypothesize phase 진입 시 모든 가설에 강제 적용 |
| 출력 계약 | decision tree의 모든 종단은 "GitHub 이슈 + TDD 계획" 또는 "명시적 non-fix 결정" 둘 중 하나 |

원자 스킬들은 "어떻게"를 제공하고, technique은 "언제·왜 이 스킬에서 저 스킬로 넘어가는가"를 제공한다.

## Hypothesis-guard 통합 규칙

`ai-guess-mark-and-review-checklist` 지식은 체크리스트다. 이 technique이 강제하는 것:

- `investigate` hypothesize 단계에서 생성되는 **모든 가설**에 체크리스트 적용
- 체크리스트 미통과 가설은 implement 단계로 진행 금지
- 미통과 사유는 GitHub 이슈 본문의 "Rejected Hypotheses" 섹션에 기록 (감사 추적)

## Output contract

`triage-issue`는 GitHub 이슈를 만들지만 형식은 자유도가 있다. 이 technique은 필수 섹션을 고정:

1. Symptom (사용자 관찰)
2. Root Cause (investigate phase 결론)
3. Rejected Hypotheses (체크리스트 미통과분)
4. Fix Plan (TDD 순서: 실패 테스트 → 최소 구현 → 리팩터)
5. Rollback 조건

## Verification (draft)

```bash
#!/usr/bin/env bash
set -e
SKILLS_HUB="${SKILLS_HUB:-$HOME/.claude/skills-hub/remote}"
for ref in \
  "skills/debug/investigate/SKILL.md" \
  "skills/debug/build-error-triage/SKILL.md" \
  "skills/debug/triage-issue/SKILL.md" \
  "knowledge/pitfall/ai-guess-mark-and-review-checklist.md"; do
  test -f "$SKILLS_HUB/$ref" || { echo "MISSING: $ref"; exit 1; }
done
echo "OK"
```

## Known limitations (v0.1 draft)

- 구성 원자 중 2개가 `0.1.0-draft` → technique도 draft 고정
- 결정트리 분기가 v0 스키마에서는 **자연어 기술**로만 표현됨 (정형 DSL 없음). Phase 순서 모델링 이상의 구조는 아직 필요 없다고 판단
- `loose` 바인딩 — `investigate`의 4-phase 구조가 major 변경되면 전체 재검증 필요
- Runtime 원인이라도 특수 케이스(메모리 누수, 경쟁 상태)는 `triage-issue`의 TDD 범위를 벗어날 수 있음 — 이런 경우 별도 technique 필요 (v0.2 검토)

## Provenance

- Authored: 2026-04-24 (kjuhwa@nkia.co.kr)
- Status: **pilot #2** for `technique/` schema v0.1 — decision-tree shape (vs pilot #1 linear pipeline)
- Schema doc: `../../../technique-schema-draft.md`
- Sibling pilot: `../../workflow/safe-bulk-pr-publishing/TECHNIQUE.md`
