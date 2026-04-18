---
description: 작업 설명을 받아 허브에서 관련 스킬·지식을 찾고 설치/참조 여부를 묻는다
argument-hint: <task description>
---

# /hub-suggest $ARGUMENTS

사용자가 구현/설계하려는 작업에 맞는 허브 항목을 먼저 찾아 보여준다. CLAUDE.md 의 pre-implementation auto-check 를 수동으로 트리거하는 입구.

## Steps

1. **키워드 추출**
   - `$ARGUMENTS` 에서 의미 토큰만 뽑는다. 불용어(은/는/을/를/해줘/구현 등)는 제거.
   - 기술 용어(spring, kafka, jwt, websocket, mongo, react, …)는 원형 유지.

2. **검색 실행**
   ```bash
   hub-search "<추출된 키워드>" -n 5
   ```
   PATH 에 없으면 `py ~/.claude/skills-hub/tools/hub_search.py` 로 대체.

3. **강한 매칭 판정**
   - 상위 결과 **score ≥ 10** AND
   - `name` 토큰이 키워드와 겹치거나 `tags` 에 키워드 2개 이상 포함
   - 미달이면 "허브에서 직접 연관된 항목을 찾지 못했습니다" 리포트 후 종료.

4. **제시 형식**
   ```
   [kind/category] <name> · <description 한 줄> · <path>
   ```
   상위 1~3 개만. 점수 부여 근거도 한 줄.

5. **사용자 선택**
   - **Skills**:
     - ① 참조만 — `~/.claude/skills-hub/remote/<path>/SKILL.md` + `content.md` 읽어서 본 작업에 반영
     - ② 설치 — `/hub-install <name>` 호출
     - ③ 건너뛰기
   - **Knowledge** (knowledge 는 설치 개념 없음):
     - ① 읽고 반영 — `~/.claude/skills-hub/remote/<path>` 읽어서 인용
     - ② 건너뛰기
   - 혼합 결과면 각각 물어본다.

6. **응답 후 진행**
   - ①/② 선택 시: 해당 MD 를 읽고, 응답 본문에 이름+경로 인용.
   - ③ 선택 시: 본 세션에서는 더 이상 이 작업에 대해 허브 제안하지 않음.

## 예시

입력:
```
/hub-suggest Spring Boot 에서 JWT refresh token 로직 구현해줘
```

실행: `hub-search "spring jwt refresh" -n 5`

출력:
```
허브에서 관련 스킬 1건 발견:

[skill/security] jwt-refresh-rotation-spring
  Spring Boot 3 JWT with short-lived access token + long-lived refresh token, filter-chain integration, and stateless session config.
  path: skills/security/jwt-refresh-rotation-spring
  (match: name-token overlap + 3 tag hits)

어떻게 진행할까요?
  ① 참조만 (MD 읽고 반영)
  ② 설치 (/hub-install jwt-refresh-rotation-spring)
  ③ 건너뛰기
```

## 주의

- 읽기 전용 작업(디버깅, 설명 요청)에는 호출하지 않는다. 그런 경우는 `/hub-find` 가 맞다.
- 매칭이 약하면 의견을 덧붙이지 말고 "없음"으로 리포트. 허상 추천 금지.
