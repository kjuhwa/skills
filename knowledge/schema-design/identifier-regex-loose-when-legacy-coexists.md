---
name: identifier-regex-loose-when-legacy-coexists
version: 0.1.0-draft
description: "When legacy and new identifier formats coexist in production data, use loose regex (^MA_.+$) over tight (^MA_.+_\\d{14}$) so OpenAPI spec and runtime reality don't diverge"
title: "식별자 regex 는 legacy + 신규 포맷이 공존하면 tight 패턴(^MA_.+_\\d{14}$) 대신 loose 패턴(^MA_.+$) 을 써라"
category: schema-design / validation / openapi
tags: [regex, identifier-pattern, schema-validation, openapi, legacy-data, pitfall]
kind: pitfall
confidence: high
source_session: 2026-04-24
---

# 증상

OpenAPI spec 에 `AgentId`/`ResourceId` schema 를 정의할 때, PDF 요구사항 예시(`MA_ADServer_20250108202624`)만 보고 tight pattern 을 썼다:

```
pattern: "^MA_.+_\\d{14}$"
example: "MA_ADServer_20250108202624"
```

실제 운영 DB 에는 다음과 같은 legacy 식별자도 존재:
- `MA_LINUX_TEST_SERVER_01` — 번호 2자리 suffix
- `MA_LINUX_ADServer_01` — 14자리 timestamp 없음
- `MA_WINDOWS_TEST_01` — 조직 단위 suffix

Tight pattern 을 적용하면:
- LLM agent 가 `MA_LINUX_TEST_SERVER_01` 을 payload 에 넣었을 때 서버 validation fail
- 프런트엔드가 식별자를 스펙대로 검증하면 기존 자원 UI 가 표시 안 됨
- "스펙과 실제 데이터 괴리" 로 AI Agent 가 올바른 다음 API 를 못 찾음

# 원인

식별자 생성 규칙이 **역사적으로 여러 번 바뀜**. 초기 버전은 조직/OS 기반 suffix, 중간 버전은 순차번호, 최신 버전은 14자리 timestamp. 마이그레이션 없이 다 누적 → 한 컬럼에 다양한 포맷이 공존.

# 해결

**Loose pattern** 으로 prefix 만 강제, suffix 는 free-form:

```
pattern: "^MA_.+$"
example: "MA_ADServer_20250108202624"   # 최신 예시는 남겨 LLM 참고용
```

# 판단 기준

- **Tight 가능**: 식별자 생성 규칙이 단일 버전, 마이그레이션 시 모든 레거시 재생성 완료. 예: 새로 만드는 서비스.
- **Loose 권장**: 운영 중인 레거시 시스템, 마이그레이션 이력 다수, 실제 DB 에 다양한 포맷 존재 확인.

빠른 검증:
```bash
# MongoDB
db.agents.distinct("agentId").sort().map(id => id.length).reduce((a,b) => Math.max(a,b), 0)
db.agents.find({agentId: {$not: /^MA_.+_\d{14}$/}}).count()

# SQL
SELECT LENGTH(agent_id), COUNT(*) FROM agent GROUP BY 1 ORDER BY 1;
SELECT COUNT(*) FROM agent WHERE agent_id NOT REGEXP '^MA_.+_[0-9]{14}$';
```

# 교훈

스펙 설계 시 **예시 하나로 pattern 을 고정하지 말 것**. 반드시 운영 데이터 분포를 확인하고, 의심되면 loose 부터 시작. Tight 가 필요해지면 언제든 좁힐 수 있지만, loose → tight 전환은 legacy data 마이그레이션 동반이라 비용 큼.

# 관련

- Lucida `lucida_ask_condensed.ko.pdf` 4.2.1 x-discovery-endpoint 섹션
- Skill `swagger-ai-optimization` Part D Phase 21
- Skill `openapi-customizer-property-name-enricher` (식별자 후처리 주입 패턴)
