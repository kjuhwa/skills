---
title: PIMS 쓰기 작업은 dry-run + 명시적 확인 + 재시도가 필수
category: domain
summary: "PIMS 시간 기록/제출/일괄 갱신 등 모든 쓰기 API는 미리보기 → 사용자 확인 → 재시도 가능한 실행 플로우를 반드시 거친다. `--dry-run`은 API 쓰기 호출 자체가 금지."
source:
  kind: project
  ref: nkia-skills@41c2032
confidence: high
---

## Fact
`log-work`, `weekly-report`, `sprint-status` 3개 스킬 모두 PIMS 쓰기 단계에서 동일한 규칙을 강제합니다:
1. 변경 대상 조회 + 중복/충돌 감지.
2. dry-run 미리보기(표 형식 before/after).
3. 명시적 사용자 확인(`"진행할까요?"`).
4. 성공/실패 처리 + 재시도(네트워크 2회, 권한 오류는 즉시 중단).
5. 삭제 동작은 **지원 금지**.

## Evidence
- `skills/log-work/SKILL.md`: "PIMS 기록 전 반드시 dry-run 출력 + 사용자 확인 필요", "`--dry-run`에서는 PIMS 쓰기 호출 절대 없음".
- `skills/weekly-report/SKILL.md`, `skills/sprint-status/SKILL.md`도 동일 규칙 명시.

## How to apply
- PIMS 관련 신규 스킬은 `dry-run-confirm-retry-write-flow` 스킬 패턴을 그대로 상속.
- 자동화·배치로 보이는 요청이라도 쓰기 단계에서는 사람 확인 단계를 생략하지 않음.
- 삭제 기능 요청이 오면 스킬로 만들지 말고 수동 처리 가이드로 안내.
