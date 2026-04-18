---
name: claude-plugin-skill-md-is-sufficient
version: 0.1.0-draft
tags: [arch, claude, plugin, skill, sufficient]
title: Claude Code 스킬은 SKILL.md 1개로 완성된다
category: arch
summary: "스킬 = SKILL.md 하나. 코드, 빌드, 의존성, 스크립트 없이도 완전히 동작한다."
source:
  kind: project
  ref: nkia-skills@41c2032
confidence: high
---

## Fact
Claude Code 스킬 플러그인은 코드나 빌드 산출물이 필요 없습니다. 각 스킬은 `SKILL.md` 하나로 정의되며, `Instructions` 섹션이 Claude에게 주는 실행 명세 자체입니다. `prompts/`, `scripts/`, `references/`는 선택사항(현재 nkia-skills에서는 `.gitkeep`만 생성됨).

## Evidence
- `package.json`은 name/version/description 3필드만 유지(의존성·스크립트 없음).
- 11개 스킬 모두 `SKILL.md` 단일 파일로 기능 완결.
- `CLAUDE.md`: "Each skill is entirely defined by its `SKILL.md`".

## How to apply
- 신규 스킬 설계 시 "코드를 둬야 하나?"부터 의심. 대부분 `Instructions` 안에 bash/MCP 호출 기술만으로 충분.
- 코드가 진짜 필요할 때(대용량 파싱, 로컬 바이너리 호출 등)만 `scripts/`에 추가.
