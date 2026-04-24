---
version: 1.0.0
name: claude-code-subagent-write-permission-scope
description: Claude Code 서브에이전트의 Edit/Write 권한은 현재 세션 CWD 의 settings.local.json 만 따라간다 — 타 프로젝트 경로는 현 세션의 allow-list 에 추가해야 함
category: pitfall
tags:
  - claude-code
  - subagent
  - permissions
  - settings-local-json
  - acceptEdits
source_project: claude-code
---

# claude-code-subagent-write-permission-scope

## 증상
상위 세션은 `D:/A` 에서 시작됐는데 서브에이전트에 다른 프로젝트 `D:/B` 의 파일을 편집하라고 지시 → 매번 `Edit denied` / `Write denied` 로 멈춘다. `mode: "acceptEdits"` 나 `mode: "bypassPermissions"` 로 스폰해도 일부 모드에서 여전히 거부.

## 원인
Claude Code 권한 시스템은 **세션의 CWD(루트 프로젝트)** 에 위치한 `.claude/settings.local.json` 을 기준으로 allow-list 를 평가한다. 타 프로젝트 경로의 `.claude/settings.local.json` 에 `Edit/Write` 를 넣어도 현재 세션에는 적용되지 않는다.

## 정답
**현재 세션의 CWD 프로젝트**에 있는 `.claude/settings.local.json` 의 `permissions.allow` 에 타 경로 접근 패턴을 추가한다:

```json
{
  "permissions": {
    "allow": [
      "Edit(D:/B/**)",
      "Write(D:/B/**)",
      "Read(D:/B/**)",
      "Glob(D:/B/**)"
    ]
  }
}
```

## 추가 관찰
- 메인 세션(parent) 은 Edit/Write 권한을 가지면서도 서브에이전트는 막히는 경우가 있다 — 최종 해결은 메인 세션이 직접 쓰거나, 세션을 타겟 프로젝트에서 다시 열기.
- `acceptEdits` 모드는 edit 승인 프롬프트만 자동 승인하며 allow-list 자체를 무시하지는 않는다.
- `bypassPermissions` 는 강력하지만 hook/sandbox 설정에 따라 여전히 거부될 수 있다.

## 회피 패턴
- 멀티 프로젝트 작업은 **메인 세션에서 직접 편집** 하거나, 각 프로젝트별로 세션을 열고 워크플로우를 나눈다.
- 시간 낭비 신호: 서브에이전트가 세 번 이상 "권한 거부" 로 실패하면 즉시 전략을 바꿀 것.
