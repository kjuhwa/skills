---
description: 지정 커밋 대비 인덱스 변경 리포트 (추가/수정/제거)
argument-hint: [base-ref] [--json]
---

# /hub-index-diff $ARGUMENTS

`~/.claude/skills-hub/remote/` 의 `<base-ref>` 커밋(기본 `HEAD~1`) 과 현재 HEAD 를 비교해 인덱스 항목의 추가·수정·제거를 보고한다.

## 실행

```bash
hub-index-diff $ARGUMENTS
```

또는 직접:

```bash
PYTHONIOENCODING=utf-8 py -3 ~/.claude/skills-hub/tools/_index_diff.py $ARGUMENTS
```

## 예시

- `/hub-index-diff` — 직전 커밋(HEAD~1) 대비
- `/hub-index-diff ae3e15d` — 특정 커밋 대비
- `/hub-index-diff main --json`

## 응답 작성 가이드

1. `추가/수정/제거` 건수를 먼저 한 줄 요약.
2. 건수가 많으면 카테고리 집계(`knowledge/pitfall +12` 식)를 덧붙인다.
3. 구체 이름 나열은 10개까지, 나머지는 "...외 N건".
