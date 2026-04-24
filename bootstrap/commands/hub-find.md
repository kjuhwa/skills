---
description: 스킬 허브 전체 코퍼스에서 키워드 기반 top-N 검색 (한/영 동의어 포함)
argument-hint: <query> [-n N] [--kind skill|knowledge|technique] [--category CAT] [--html --out FILE]
---

# /hub-find $ARGUMENTS

`~/.claude/skills-hub/remote/index.json` 을 대상으로 키워드 점수화 검색을 수행한다. 한글 쿼리도 180+ 동의어 맵을 거쳐 확장된다 (예: "스프링" → spring, spring-boot).

## 실행

```bash
hub-search $ARGUMENTS
```

PATH 에 없으면 직접 호출:

```bash
PYTHONIOENCODING=utf-8 py -3 ~/.claude/skills-hub/tools/hub_search.py $ARGUMENTS
```

## 예시

- `/hub-find 카프카 이벤트`
- `/hub-find websocket -n 20 --kind skill`
- `/hub-find rate-limit --category decision`
- `/hub-find "pr publish" --kind technique`
- `/hub-find 보안 --json`
- `/hub-find 인증 --html --out /tmp/auth.html`

## 응답 작성 가이드

1. CLI 출력에서 상위 3~5개 항목의 `name` 과 `path` 를 요약.
2. 직접 관련된 항목은 `~/.claude/skills-hub/remote/<path>` 실제 MD 를 읽어 구체 인용.
3. 동의어 확장이 의도와 달랐다면 `--synonyms` 로 검증.
