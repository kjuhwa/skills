---
title: SKILL.md 예시 데이터는 반드시 익명화한다
category: pitfall
summary: "실사 티켓 번호·실명·프로젝트명이 예시에 들어가면 보안 감사에서 지적됨. 공용 repo 기준 모든 예시는 익명 더미여야 한다."
source:
  kind: project
  ref: nkia-skills@3315455
confidence: high
---

## Fact
사내 공용 플러그인 repo는 외부 공유 가능성이 있어 **SKILL.md 예시 데이터를 모두 익명화**합니다:
- 티켓 번호: `#100001`, `#100002` 같은 더미 범위.
- 인명: `홍길동`, `김철수`.
- 기능명: `기능A`, `기능B`.
- 마일스톤: `v10.3.0` 같은 중립 값.

## Evidence
- 커밋 `3315455` — "Fix: 보안 감사 + 코드 품질 점검 반영 — 예시 데이터 익명화, frontmatter 정규화, 문서 보강".
- 현재 모든 SKILL.md 예시가 위 패턴을 따름.

## How to apply
- 새 SKILL.md 작성 시 실제 작업 기록을 붙여넣지 말고, 익명 더미로 가공해 삽입.
- 코드 리뷰에서 실제 이름·실제 티켓 번호가 보이면 즉시 익명화 요청.
- frontmatter `description`은 따옴표로 감싸 YAML 정규화 유지.
