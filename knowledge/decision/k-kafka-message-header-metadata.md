---
version: 0.1.0-draft
name: k-kafka-message-header-metadata
type: knowledge
category: decision
tags: [kafka, multi-tenant, routing, message-schema]
summary: "멀티테넌트 Kafka routing 메타는 payload 대신 RecordHeader에 두어 business schema 오염을 막는다"
source:
  kind: commit
  ref: da42d24373484f3275430e1f61d914bdd02ac740
  repo: https://github.com/kjuhwa/skills.git
confidence: medium
linked_skills: [kafka-message-header-metadata]
supersedes: null
extracted_at: 2026-04-15
extracted_by: skills_extract_knowledge v1
---

## Fact
tenant/user/timestamp 같은 cross-cutting 메타데이터는 Kafka `RecordHeader[]` 에 분리 수록한다. Payload schema는 business 필드만 유지되어야 routing·auditing 계층이 업무 스키마 변경과 독립적으로 진화할 수 있다.

## Context / Why
- Multi-tenant routing 키를 payload 안에 섞으면 모든 consumer가 tenant 구조를 알아야 하고, payload schema가 업무 외 이유로 자주 바뀐다.
- Header는 Kafka broker 수준에서 접근 가능해 routing·filtering·audit hook이 payload deserialize 없이 동작할 수 있다.
- org-id/user-id/request-timestamp는 표준 header key로 승격하여 consumer 전반에 동일 키를 강제한다.

## Evidence
- [commit da42d24] skills/backend/kafka-message-header-metadata/SKILL.md:1-81

## Applies when
- 멀티테넌트 Kafka 토픽 설계
- payload schema를 업무 도메인 전용으로 유지하고 싶을 때
- broker/interceptor 수준의 routing·auditing이 필요할 때

## Counter / Caveats
- Header에 개인정보(PII)가 들어가면 payload 암호화와 header 암호화 정책이 별도로 필요해진다.
- 일부 legacy consumer/프로토콜(예: pre-0.11 Kafka)은 header를 지원하지 않는다 — 호환성 확인 필요.
- Header 총 크기 제한(브로커 설정)으로 인해 무제한 확장은 불가.
- 반증 사례(header 방식이 실패한 시스템) 기록이 아직 부족해 confidence는 medium.
