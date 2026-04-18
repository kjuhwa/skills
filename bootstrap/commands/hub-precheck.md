---
description: 스킬 허브 사전 검증 (lint + master/lite/category 인덱스 재생성)
argument-hint: [--strict] [--skip-lint]
---

# /hub-precheck $ARGUMENTS

스킬/지식 코퍼스의 프런트매터 스키마를 검증하고 모든 인덱스(L1 전체·L1 경량·L2 카테고리별)를 재생성한다.

## 실행

```bash
hub-precheck $ARGUMENTS
```

PATH 에 없으면 직접 호출:

```bash
PYTHONIOENCODING=utf-8 py -3 ~/.claude/skills-hub/tools/precheck.py $ARGUMENTS
```

## 출력 해석

- `[ALL PASS]` — 모든 파일이 스키마 충족, 인덱스 3종 (`~/.claude/skills-hub/indexes/`) 갱신 완료.
- `[ABORT] lint` — 누락 필드가 있는 파일이 있음. 리포트를 보고 자동 보정(`py ~/.claude/skills-hub/tools/_fix_frontmatter.py`)이나 수동 편집을 안내.
- 비정상 종료 코드는 사용자에게 그대로 전달한다.

## 주의

- 원격 clone (`~/.claude/skills-hub/remote/`) 안의 파일은 PR을 통해서만 수정한다.
