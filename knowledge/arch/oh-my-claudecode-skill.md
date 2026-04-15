---
name: oh-my-claudecode-skill
type: knowledge
category: arch
tags: [external-reference, oh-my-claudecode, omc, workflow, skill]
summary: "OMC implements \"skill\" as: Manage local skills - list, add, remove, search, edit, setup wizard"
source:
  kind: manual
  ref: https://github.com/Yeachan-Heo/oh-my-claudecode@09ffccc
  repo: external
confidence: medium
linked_skills: []
supersedes: null
extracted_at: 2026-04-15
extracted_by: skills_import_git --as-knowledge
---

## Fact
oh-my-claudecode (OMC) 는 `skill` 이름의 스킬로 다음 의도를 구현한다: Manage local skills - list, add, remove, search, edit, setup wizard. 원본 위치: `skills/skill/SKILL.md` in `https://github.com/Yeachan-Heo/oh-my-claudecode` (commit `09ffccc`).

## Context / Why
- OMC는 널리 사용되는 멀티에이전트 오케스트레이션 레이어이며, 해당 도메인에서 **성숙한 한 가지 접근법**의 레퍼런스다.
- 우리 프로젝트의 같은 의도의 스킬을 설계·개선할 때 비교 기준점이 된다.
- 원본 SKILL.md 전문은 로컬 `~/.claude/skills-hub/knowledge/reference/oh-my-claudecode-skill.md` 에 보존돼 있어 언제든 상세 확인 가능하다.

## Evidence
- 출처: `https://github.com/Yeachan-Heo/oh-my-claudecode` / commit `09ffccc558031f384a2753328d269803c3d2f8cd`.
- 가져온 방식: `/skills_import_git --as-knowledge` (외부 저장소 → `knowledge/reference/`).
- Claude Code 스킬 로더는 이 참조 파일을 **자동 발견하지 않는다** (`knowledge/` 아래이므로).

## Applies when
- 우리 프로젝트에서 같은 이름·의도의 스킬을 새로 설계할 때 → OMC 구현 형태와 비교.
- 유사 기능을 가진 기존 스킬을 리팩토링할 때 → OMC의 frontmatter·트리거·에이전트 위임 패턴과 대조.
- OMC 생태계와 상호운용/호환이 필요할 때 → 이름 충돌·관례 차이를 미리 파악.

## Counter / Caveats
- **직접 복제 금지**: 이 항목은 설계 참고일 뿐, 원본 문구를 우리 활성 스킬에 그대로 복사하면 라이선스·스타일 문제가 된다.
- **관례 차이**: OMC의 frontmatter 필드(`level`, `argument-hint` 등), 트리거 키워드, 에이전트 위임 규칙은 우리와 다를 수 있다 — 직접 이식 전 매핑 검토 필수.
- **신뢰도 medium**: 외부 저장소, 로컬 검증 없음. 실제 OMC 동작은 우리가 실행해보지 않았다.
