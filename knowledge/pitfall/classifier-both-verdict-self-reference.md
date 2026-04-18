---
version: 0.1.0-draft
name: classifier-both-verdict-self-reference
type: knowledge
category: pitfall
tags: [llm, classifier, schema, post-processing, linking]
summary: "LLM classifier의 both-verdict에 suggested_links를 허용하면 자기 자신을 가리키는 self-link가 나온다 — 링크는 post-process에서 붙일 것"
source:
  kind: session
  ref: session-2026-04-15-skills-extract-knowledge
  repo: local
confidence: medium
linked_skills: []
supersedes: null
extracted_at: 2026-04-15
extracted_by: skills_extract_knowledge v1
---

## Fact
한 청크에서 두 종류의 산출물(예: skill + knowledge)을 동시에 생성하는 "both" verdict를 LLM classifier에 시킬 때, 같은 스텝에서 `suggested_links` 까지 요구하면 LLM이 동일 slug를 자기 자신에게 연결하는 self-reference를 출력한다. 링크 설정은 classifier 스키마에서 빼고, 동일 청크에서 나온 산출물 쌍을 post-process 단계에서 자동으로 양방향 연결하라.

## Context / Why
- LLM은 "이 knowledge는 어떤 skill과 연결되나?"라는 질문에 문맥상 가장 가까운 이름 — 즉 방금 자신이 만든 skill 이름 — 을 선택하는 경향이 있다.
- Self-link는 그래프/표시 단계에서 "자기 자신에게 연결된" 무의미 엣지를 만들어 UX를 해치고, 중복 제거 로직도 꼬이게 한다.
- Post-process는 같은 chunk_id에서 파생된 `(skill_slug, knowledge_slug)` 쌍을 결정적으로(non-LLM) 연결할 수 있어 더 견고하다.
- Cross-chunk 연결(다른 청크의 기존 skill/knowledge 참조)은 여전히 classifier가 후보를 제안해야 하므로, "self vs cross" 링크 요구를 분리하는 것이 핵심.

## Evidence
- skills-hub `/skills_extract_knowledge` classifier 초안의 first dry-run: 3개 both-verdict 청크 모두 `suggested_links: [<자기-slug>]` 출력.
- 규칙 수정 후(`suggested_links 비우기 + post-process 자동 쌍 연결`)에서 self-loop 사라짐.
- [commit 3559fc6] bootstrap/commands/skills_extract_knowledge.md — Classify Rules 섹션의 "both verdict 처리" 항목.

## Applies when
- LLM classifier가 한 입력으로 다중 산출물(예: skill+knowledge, summary+tags) + 상호 링크를 동시에 만들어야 할 때
- 구조화 출력 스키마 설계에서 "생성"과 "연결"을 한 호출에 섞어야 하는 유혹이 있을 때

## Counter / Caveats
- Post-process 자동 연결은 **동일 청크에서 파생된 쌍**에만 적용 가능. 진짜 cross-chunk 링크는 classifier가 후보를 내야 한다 → self/cross를 별도 스키마 필드로 분리 필요.
- Classifier가 self-link를 내지 않도록 프롬프트로 제약하면 되는 것 아니냐는 반론: 가능하나 모델/온도/프롬프트 변경마다 회귀 위험 → 스키마 수준의 하드 제거가 더 견고.
- "같은 청크 쌍 자동 연결"은 slug 생성이 결정적일 때만 성립. 랜덤 ID를 쓰면 어느 쌍이 같은 청크인지 추적할 메타데이터가 필요.
