---
name: skill-registry-vs-skill-config-split
version: 0.1.0-draft
tags: [decision, skill, registry, config, split]
title: `skill-registry.yaml`과 `skill-config.yaml`을 분리한다
category: decision
summary: "원격 저장소 정보는 `.claude/skill-registry.yaml`, 스킬별 런타임 옵션(출력 경로 등)은 `.claude/skill-config.yaml`. 파일 단위로 관심사 분리."
source:
  kind: project
  ref: nkia-skills@41c2032
confidence: high
---

## Fact
두 설정 파일의 역할이 명확히 다릅니다:

| 파일 | 소비자 | 키 예시 |
|------|--------|---------|
| `.claude/skill-registry.yaml` | `skill-publish`, `skill-install`, `skill-list --remote` | `registry.remote_url`, `registry.branch` |
| `.claude/skill-config.yaml` | `task-review`, `weekly-report` | `task_review.output_dir`, `weekly_report.output_dir` |

둘 다 없어도 기본값으로 동작(local 모드, 기본 출력 경로).

## Evidence
- `skills/skill-publish/SKILL.md`, `skills/skill-install/SKILL.md`에서 `skill-registry.yaml`만 읽음.
- `skills/task-review/SKILL.md`, `skills/weekly-report/SKILL.md`에서 `skill-config.yaml`만 읽음.

## How to apply
- 신규 스킬이 "출력 경로/포맷" 옵션을 받으려면 `skill-config.yaml`에 네임스페이스(`{skill_name}.*`)로 추가.
- 원격 저장소·인증 관련 값은 절대 `skill-config.yaml`에 섞지 않음.
