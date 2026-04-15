---
title: 계층형 AGENTS.md로 스킬 카탈로그를 관리한다
category: arch
summary: "루트 AGENTS.md(프로젝트 개요) + `skills/AGENTS.md`(스킬 카탈로그) 2계층 구조. 하위는 상위를 `<!-- Parent: ../AGENTS.md -->` 주석으로 가리킨다."
source:
  kind: project
  ref: nkia-skills@41c2032
confidence: medium
---

## Fact
AGENTS.md를 프로젝트별 단일 문서로 쓰지 않고 계층화합니다:
- 루트 `AGENTS.md` — 프로젝트 목적, Key Files, 하위 디렉토리 설명.
- `skills/AGENTS.md` — 스킬 카탈로그(이름/설명/사용법 표), 워크플로우 다이어그램.
- 하위 문서는 상단에 `<!-- Parent: ../AGENTS.md -->` + 생성/갱신일 주석 유지.
- `<!-- MANUAL: ... -->` 마커 이하 수동 추가 메모는 재생성에서도 보존.

## Evidence
- 커밋 `41c2032` — "Docs: 계층형 AGENTS.md 추가 + 중복 내용 정리".
- 루트/`skills` 양쪽 AGENTS.md 모두 Generated/Updated 타임스탬프와 Parent 주석 존재.

## How to apply
- 새 디렉토리 트리가 추가되면 해당 디렉토리에 AGENTS.md를 두고 루트에서 링크/요약.
- 카탈로그 표는 `skills/AGENTS.md` 한 곳에만 두고 `README.md`와 중복 시 동기화.
