---
version: 0.1.0-draft
tags: [pitfall, static, value, injection, race, condition]
name: static-value-injection-race-condition
description: static 필드에 @Value 주입은 setter 호출 타이밍과 멀티스레드 가시성으로 레이스 컨디션을 유발 — 인스턴스 필드로 직접 주입하라
type: knowledge
category: pitfall
source:
  kind: project
  ref: lucida-domain-automation@b6ef254e
confidence: high
---

# Fact
Spring은 `static` 필드에 `@Value`를 직접 바인딩하지 못한다. 관용적으로 `public static int X; @Value("...") public void setX(int v){ X=v; }` 식으로 우회하는데, 이는:
1. setter 호출 전에 다른 Bean이 `X`를 참조할 수 있다(초기화 순서 의존).
2. non-volatile static 쓰기 후 다른 스레드가 구 값을 볼 수 있다(가시성).
3. 두 번째 컨텍스트가 뜰 때 덮어쓰기 가능.

# Why it matters
- ThreadPoolConfig에서 core/max/queue 크기가 "가끔" 구 기본값으로 동작하던 증상의 근본 원인.
- 리플렉션/테스트에서도 `@TestPropertySource`가 반영되지 않는 문제 발생.

# Evidence
- 커밋 `b6ef254e`: ThreadPoolConfig static 필드를 인스턴스 필드로 변경 — setter 4개 제거, `@Value` 직접 주입.
- `documents/code_improvement_report.md` §2-1.

# How to apply
- `@Configuration` / `@Component` 의 주입 대상은 **항상 인스턴스 필드** + 생성자 주입 또는 `@Value` 필드 주입.
- 전역 상수가 정말 필요하면 `@ConfigurationProperties` 불변 record로 노출하고 Bean으로 주입받아 사용.
- static을 유지해야 한다면 `volatile` + 초기화 완료 신호 Bean, 하지만 사실상 피해야 한다.

# Counter / Caveats
- 레거시 코드에서 static setter 패턴을 발견하면, 참조처를 먼저 Bean 주입으로 바꾸고 나서 static을 제거 — 역순은 NPE 위험.
