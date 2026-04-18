---
version: 0.1.0-draft
name: additive-registry-schema-versioning
type: knowledge
category: arch
tags: [registry, schema, versioning, migration, backwards-compat]
summary: "JSON registry 진화는 version bump + 새 키 empty container + 첫 쓰기 시 자동 마이그레이션으로 하라"
source:
  kind: session
  ref: session-2026-04-15-skills-extract-knowledge
  repo: local
confidence: high
linked_skills: []
supersedes: null
extracted_at: 2026-04-15
extracted_by: skills_extract_knowledge v1
---

## Fact
클라이언트가 공유하는 JSON registry 스키마를 진화시킬 때는 세 가지를 동시에 지켜라:
1. 최상위 `version` 필드를 bump (없으면 도입).
2. 신규 필드는 empty container(`{}`, `[]`, `null`)로 추가 — 기존 엔트리를 절대 건드리지 않는다.
3. 클라이언트는 첫 쓰기 직전에 감지·자동 마이그레이션하고 temp-file + rename으로 atomic write.

## Context / Why
- Registry는 여러 클라이언트/세션이 동시에 읽고 쓰는 공유 상태라 downtime 마이그레이션이 불가능하다.
- 필드 추가만 하는 진화는 옛 클라이언트가 새 필드를 무시하고도 읽기가 성립 → 전진 호환.
- 새 클라이언트는 `version < target` 을 보자마자 필요한 빈 필드만 채워넣어 쓰기 → 후진 호환 유지 + 업그레이드.
- Atomic write (temp + rename)은 마이그레이션 중 crash 시 반쪽 상태 방지.

## Evidence
- skills-hub registry v1 → v2 전환: `version` 필드 신설, `knowledge: {}` 추가, 각 skill에 `linked_knowledge: []` 추가, 기존 skill 엔트리 원형 보존.
- v1 클라이언트는 `knowledge` 키를 읽지 않아도 동작 유지.
- [commit 3559fc6] bootstrap/commands/skills_extract_knowledge.md — Preconditions 섹션에 마이그레이션 절차 명문화.

## Applies when
- JSON/YAML 기반 공유 registry/manifest의 스키마 변경
- 중앙 서버 없이 파일 기반으로 동기화되는 설정 저장소
- 여러 버전의 클라이언트가 공존할 수 있는 환경 (점진 rollout)

## Counter / Caveats
- **의미 변경 금지**: 이 패턴은 필드 "추가"에만 유효하다. 기존 필드의 의미/타입을 바꿔야 하는 변경은 새 key로 분기하고 deprecation 기간을 둘 것.
- **무한 누적 리스크**: 버전이 쌓이면 legacy 필드 청소가 안 된다 → 주기적으로 `version` major bump로 breaking migration 창구를 만들어야 한다.
- **동시 쓰기 경합**: atomic rename이 OS 수준에서 보장되지 않는 파일시스템(일부 네트워크 FS)에서는 lock 파일 병행 필요.
