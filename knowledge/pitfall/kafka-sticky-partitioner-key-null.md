---
version: 0.1.0-draft
tags: [pitfall, kafka, sticky, partitioner, key, null]
name: kafka-sticky-partitioner-key-null
description: ProducerRecord key=null일 때 Sticky Partitioner가 batch.size 동안 한 파티션에 몰리는 성질 — 소규모 환경에서 Pod 분산 안 보이는 원인
type: knowledge
category: pitfall
source:
  kind: project
  ref: lucida-domain-automation@b0cf1adb
confidence: high
---

# Fact
Kafka Producer가 `ProducerRecord`에 key=null을 쓰면 **Sticky Partitioner**가 `batch.size`(기본 16KB)가 찰 때까지 동일 파티션에 누적한 뒤 다음 파티션으로 넘어간다. 따라서 적은 수의 메시지를 발행하는 개발 환경에서는 하나의 파티션/Pod로 메시지가 몰리는 것이 **정상 동작**이다.

# Why it matters
- 개발 환경에서 "여러 Pod인데 한 쪽만 일한다"는 보고가 들어오면 버그로 오인하기 쉽다.
- key=organizationId로 바꾸면 소규모에서도 분산되어 보이지만, **같은 테넌트의 모든 메시지가 특정 파티션으로 고정**되어 프로덕션에서 hot partition 발생.
- 이 프로젝트(Engine)는 TCM 선례를 따라 key=null + organizationId는 헤더로 전달하는 방식을 채택.

# Evidence
- `documents/engine_implementation.md` §Kafka 파티셔닝 섹션: 장비 ~10대 이하 1파티션, ~15대 이상부터 2파티션, ~30대 이상 3파티션 분산 예측 표.
- 커밋 `747cae19`: "Engine 문서에 Kafka 파티셔닝 및 멀티 Pod 분산 설명 추가".

# How to apply
- 분산 여부 테스트는 **프로덕션 규모(수백~수천 메시지)** 또는 `batch.size`를 일시적으로 낮춰 검증.
- 작은 규모에서 강제 분산이 필요하면 `batch.size`, `linger.ms`를 조정하거나 `RoundRobinPartitioner` 명시.
- key를 도입할 때는 "같은 key가 한 파티션에 묶여도 되는가" 도메인 수준 검토 필수.

# Counter / Caveats
- Kafka 3.3+에서 기본 partitioner가 `BuiltInPartitioner`로 바뀌며 sticky 기간이 동적이다 — 수치는 근사치.
- 트랜잭션/순서 보장이 필요한 메시지는 key 기반 라우팅이 여전히 맞다.
