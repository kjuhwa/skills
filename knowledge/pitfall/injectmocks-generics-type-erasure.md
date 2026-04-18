---
version: 0.1.0-draft
tags: [pitfall, injectmocks, generics, type, erasure]
name: injectmocks-generics-type-erasure
description: @InjectMocks가 제네릭 필드에 Mock을 주입할 때 타입 소거로 잘못된 후보를 고르는 flaky 원인
type: knowledge
category: pitfall
source:
  kind: project
  ref: lucida-domain-automation@db8ac35e
confidence: high
---

# Fact
`@InjectMocks`는 필드 타입만 보고 `@Mock`을 매칭하는데, 제네릭 필드(`Repository<A>`, `Repository<B>`)는 타입 소거로 동일한 raw 타입이 되어 **후보가 여러 개일 때 주입이 비결정적**이 된다. 결과적으로 테스트가 실행 순서/로더에 따라 flaky하다.

# Why it matters
- SchedulerComponentTest가 "어떤 날은 통과, 어떤 날은 실패"하는 증상의 근본 원인.
- Mockito가 경고 없이 조용히 잘못된 mock을 주입해 assertion이 엉뚱한 곳에서 깨진다.

# Evidence
- 커밋 `db8ac35e`: "SchedulerComponentTest flaky 테스트 수정 — @InjectMocks 타입 소거 문제 해결".

# How to apply
- 제네릭 파라미터가 다른 Repository/Component가 여럿이면 `@InjectMocks` 대신 **생성자 주입을 수동으로 new**하고 Mock을 명시적으로 인자에 넣는다.
- 또는 `@Spy` / 생성자 인자 매칭이 명확한 클래스로 테스트 대상을 리팩터.
- 테스트 계층에서 `@MockitoBean`(@SpringBootTest)을 쓰더라도 같은 raw 타입 여러 개라면 `@Qualifier` 동반.

# Counter / Caveats
- 필드가 하나뿐이면 문제 없음 — 다중 제네릭 필드에서만 발생.
- Lombok `@RequiredArgsConstructor`로 생성자가 자동 생성되는 대상에는 수동 new 조립이 오히려 안전.
