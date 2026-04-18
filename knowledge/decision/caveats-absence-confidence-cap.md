---
version: 0.1.0-draft
name: caveats-absence-confidence-cap
type: knowledge
category: decision
tags: [calibration, confidence, falsifiability, knowledge-quality]
summary: "반증 조건(Counter/Caveats)이 비어 있는 knowledge는 confidence 최대 medium으로 강등한다 — 미확인 = 과신 위험"
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
Knowledge 항목의 `## Counter / Caveats` 섹션이 비어 있으면 confidence를 자동으로 `medium` 이하로 제한하라. 반증 경로를 명시하지 않은 주장은 "검증되지 않은 단정"으로 간주하고, 그 자체가 calibration 신호다.

## Context / Why
- Popper 의미의 반증 가능성(falsifiability) — 어떤 조건에서 이 명제가 깨지는지 적을 수 있어야 지식이 검증 가능.
- "caveats를 못 쓰겠다"는 두 가지 신호 중 하나다: (a) 작성자가 반례를 떠올리지 못했다 → 조사 부족, (b) 명제가 너무 일반화되어 반례가 자명하다 → 범위 재정의 필요. 둘 다 `high` 를 줄 근거가 아니다.
- Confidence는 다운스트림(검색 랭킹, auto-inject, skill 추천)의 가중치로 쓰이므로, 초기 저장 시점의 규율이 검색 품질을 좌우한다.

## Evidence
- skills-hub classifier rule: "Caveats 결손 시 confidence 최대 medium" 명문화.
- Dry-run 사례: `k-kafka-message-header-metadata`가 초기 `high` 후보였으나 반증 사례 기록 부족으로 `medium` 유지 — 이후 실제 header 미지원 consumer 존재로 이 강등이 정당화됨.
- [commit 3559fc6] bootstrap/commands/skills_extract_knowledge.md — Classify Rules "Caveats 결손 시 강등" 항목.

## Applies when
- Knowledge/RFC/ADR 스타일의 서술 항목 저장 시 calibration이 필요할 때
- LLM이 자동 생성한 주장에 과신 위험이 있는 pipeline
- 검색·랭킹·자동 주입이 confidence를 가중치로 사용하는 시스템

## Counter / Caveats
- **진짜 반례가 없는 명제 예외**: 수학적 항등식, 순수 정의, 프로토콜 스펙 인용 등은 Caveats가 비어도 자연스럽다 → 명시적 `caveats: none` 마커로 override 허용 필요.
- 규칙 강도 과한 가능성: `medium` 강등이 진짜 고신뢰 지식을 저평가하면 검색 품질이 떨어질 수 있다 → 사용 후 false-downgrade 비율을 모니터링해 임계 조정.
- Caveats 작성 부담이 오히려 knowledge 추출 자체를 기피하게 만들면 역효과 → extract UI에서 "Caveats 없음 허용" 빠른 경로 제공 고려.
