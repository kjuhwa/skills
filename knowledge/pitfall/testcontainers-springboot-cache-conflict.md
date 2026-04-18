---
version: 0.1.0-draft
tags: [pitfall, testcontainers, springboot, cache, conflict]
name: testcontainers-springboot-cache-conflict
description: @Testcontainers + @SpringBootTest 컨텍스트 캐싱 충돌 — @DynamicPropertySource + static start() 패턴으로 대체
type: knowledge
category: pitfall
source:
  kind: project
  ref: lucida-domain-automation@b0cf1adb
confidence: high
---

# Fact
JUnit5의 `@Testcontainers` + `@Container`는 테스트 클래스 생명주기에 컨테이너를 바인딩하는데, Spring Boot의 **테스트 컨텍스트 캐싱**과 충돌해:
- 컨테이너가 테스트 클래스마다 재시작.
- 캐시된 컨텍스트가 이미 죽은 컨테이너의 호스트/포트를 참조.
- 결과적으로 전체 테스트 스위트가 느려지거나 간헐적 실패.

# Why it matters
- 권장 패턴은 **정적 블록 `static { container.start(); }`** 으로 JVM 수명 동안 유지 + `@DynamicPropertySource`로 Spring 프로퍼티에 주입.
- `System.setProperty()`로 주입하면 Spring이 이미 프로퍼티를 바인드한 이후라 반영 안 됨.

# Evidence
- `CLAUDE.md` §테스트 전략: "@Testcontainers + @Container는 @SpringBootTest의 컨텍스트 캐싱과 충돌 — 사용 금지", "프로퍼티 주입은 @DynamicPropertySource 사용".
- `TestSupport` 추상 클래스가 MongoDB/Kafka(KRaft)/EMQX 3개 컨테이너를 static 블록으로 기동.

# How to apply
- 베이스 클래스(`TestSupport`, `MongodbContainerTest`)에 `static { ... start(); }` 배치.
- 자식 테스트는 `@Testcontainers` 어노테이션을 쓰지 않는다.
- 프로퍼티 주입은 오로지 `@DynamicPropertySource` 메서드 사용.
- Kafka는 `ConfluentKafkaContainer`(KRaft 모드) — 기존 `KafkaContainer`는 deprecated.
- `TESTCONTAINERS_REUSE_ENABLE=false` — JVM 종료 시 컨테이너 자동 정리.

# Counter / Caveats
- 단일 테스트 클래스만 쓰는 모듈이나 Spring 컨텍스트 없는 순수 Testcontainers 테스트는 `@Testcontainers`도 무해.
- `@MockitoBean`(Spring Boot 3.4+) 사용 — `@MockBean`은 deprecated.
