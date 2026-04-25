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

2. **검색 실행 (4-layer)**
   - 핵심: skill/knowledge **그리고** technique/paper 까지 같이 검색해서 사용자가 한 단계 위 추상에서 이미 검토된 패턴이 있는지 알 수 있게 한다.
   ```bash
   hub-search "<추출된 키워드>" -n 8
   ```
   결과는 kind 별로 묶어서 본다 (skill / knowledge / technique / paper). PATH 에 없으면 `py ~/.claude/skills-hub/tools/hub_search.py` 로 대체.

3. **강한 매칭 판정**
   - 상위 결과 **score ≥ 10** AND
   - `name` 토큰이 키워드와 겹치거나 `tags` 에 키워드 2개 이상 포함
   - 우선순위: 같은 점수면 **paper > technique > skill > knowledge** 순. 위 레이어가 더 높은 추상에서 작업을 본다.
   - 미달이면 "허브에서 직접 연관된 항목을 찾지 못했습니다" 리포트 후 종료.

4. **제시 형식**
   ```
   [paper/<category>] <slug> · <description 한 줄> · <path> · type=<hypothesis|survey|position> status=<status>
   [technique/<category>] <slug> · <description 한 줄> · <path> · composes <N> atoms
   [skill/<category>] <name> · <description 한 줄> · <path>
   [knowledge/<category>] <slug> · <summary 한 줄> · <path>
   ```
   상위 1~5 개만 (kind 가 섞여있으면 각 1개씩 우선). 점수 부여 근거도 한 줄.

5. **사용자 선택** (kind 별로 다름)
   - **Paper** (먼저 보여주는 게 핵심):
     - ① 읽고 premise/perspectives/limitations 반영 — `/hub-paper-show <slug>` 자동 실행
     - ② 이 paper 의 `proposed_builds[]` 중 작업과 맞는 게 있으면 `/hub-make` 로 scaffold 시도
     - ③ 건너뛰기
   - **Technique**:
     - ① 참조 — `/hub-technique-show <slug>` 로 composes[] 와 phase sequence 보고 적용
     - ② composes[] 의 atom 들 일괄 설치 — `/hub-install` 을 atom 마다 호출
     - ③ 건너뛰기
   - **Skill**:
     - ① 참조만 — `~/.claude/skills-hub/remote/<path>/SKILL.md` + `content.md` 읽어서 본 작업에 반영
     - ② 설치 — `/hub-install <name>` 호출
     - ③ 건너뛰기
   - **Knowledge** (knowledge 는 설치 개념 없음):
     - ① 읽고 반영 — `~/.claude/skills-hub/remote/<path>` 읽어서 인용
     - ② 건너뛰기
   - 혼합 결과면 각각 물어본다. paper 가 있으면 먼저 보여줘서 사용자가 "이미 분석된 cost 곡선·threshold·tradeoff" 를 인지한 채로 진행하게 한다.

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
