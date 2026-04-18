---
version: 0.1.0-draft
tags: [decision, dataavro, json, wrapper, pattern]
name: dataavro-json-wrapper-pattern
description: 여러 이벤트 타입마다 Avro 스키마를 만들지 않고 DataAvro{jsonData,jsonDataClass} 하나로 통일 — TCM 선례 채택
type: knowledge
category: decision
source:
  kind: project
  ref: lucida-domain-automation@f7d86645
confidence: medium
---

# Decision
자동화 도메인 Kafka 메시지는 **단일 Avro 스키마 `DataAvro`** 로 통일한다. `DataAvro`는 `{ organizationId, jsonDataClass: String, jsonData: String }` 구조이며, 실제 페이로드(`RequestUnit`, `AutomationEventMessage` 등)는 Java record로 정의해 JSON 직렬화 후 `jsonData`에 담는다.

# Why
- 신규 이벤트 타입이 늘어날 때마다 `.avsc` 추가 → Schema Registry 충돌/빌드 증가 → 롤아웃 지연.
- JobType 10종 각각에 Avro 정의를 두면 스키마 진화(필드 추가/이름 변경)가 양방향 호환 제약으로 매우 까다롭다.
- TCM 프로젝트에서 이미 검증된 패턴(`EachTaskEventPublisher`/`PublishUnit`).

# Evidence
- 커밋 `f7d86645`: "AutomationEvent Avro를 DataAvro로 마이그레이션".
- 삭제된 Avro 스키마 3개: `AutomationEvent.avsc`, `AccountEventAvro.avsc`, `ConfigurationResourceTopic.avsc` (후자는 framework-bom에서 제공).
- `documents/engine_implementation.md` §3. RequestUnit record.

# How to apply
- 신규 Kafka 메시지 타입 = **record 정의 + `jsonDataClass`에 FQN 저장**. Avro 스키마 건드리지 않는다.
- Consumer는 `GenericRecord`로 수신 → `jsonDataClass`로 동적 디스패치 또는 Strategy Map 조회.
- 헤더에 `organizationId` 등 라우팅 키, body는 `jsonData` 파싱으로.

# Counter / Caveats
- 타입 안전성이 컴파일 타임이 아니라 런타임으로 이동 — 역직렬화 실패 테스트 필수.
- Schema Registry의 스키마 진화 검증은 포기하는 대가 — 별도 JSON 스키마 검증/계약 테스트로 보완 권장.
- 외부 시스템과 공유하는 토픽에는 부적합 — 내부 도메인 토픽에만 사용.
