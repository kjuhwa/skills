---
name: plugin-repo-scope-generic-skills-only
version: 0.1.0-draft
tags: [decision, plugin, repo, scope, generic, skills]
title: 플러그인 repo에는 프로젝트 독립적 스킬만 담는다
category: decision
summary: "nkia-skills 같은 공용 플러그인에는 범용 스킬만. 프로젝트 특화 스킬은 각 프로젝트의 `.claude/skills/`에 둔다."
source:
  kind: project
  ref: nkia-skills@41c2032
confidence: high
---

## Fact
`generate-be`, `extract-api-spec` 같은 **프로젝트 특화 스킬**은 공용 플러그인 repo에 포함시키지 않고, 각 프로젝트의 `.claude/skills/`에서 관리합니다. 공용 repo에는 `skill-*`(라이프사이클)과 `dev-start`/`log-work`/`weekly-report`/`sprint-status`/`task-review`(PIMS+git 기반 범용)만 둡니다.

## Evidence
- `CLAUDE.md`: "Only project-independent, general-purpose skills belong in this repo; project-specific skills go in each project's `.claude/skills/`".
- `skills/AGENTS.md` 카탈로그가 "스킬 관리 도구" + "일상 업무 자동화" 두 카테고리만 노출.

## How to apply
공용 플러그인에 스킬을 추가하기 전에 "이게 다른 프로젝트에서도 그대로 쓸 수 있는가?" 자문. NO면 해당 프로젝트의 `.claude/skills/`로 보내고, `skill-publish`로 공용 repo에 공유하지 않음.
