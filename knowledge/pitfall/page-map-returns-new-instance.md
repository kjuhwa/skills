---
name: page-map-returns-new-instance
description: Spring Data Page는 불변 — Page.map()은 새 인스턴스를 반환하므로 호출 결과를 반드시 재할당해야 한다
type: knowledge
category: pitfall
source:
  kind: project
  ref: lucida-domain-automation@c8b77573
confidence: high
---

# Fact
`org.springframework.data.domain.Page#map(Function)`은 기존 Page를 변경하지 않고 **새 Page를 반환**한다. 반환값을 버리면 원본은 그대로이며, 내부 루프에서 entity를 수정해도 DTO 변환이 반영되지 않는다.

# Why it matters
- `OssLicenseServiceImpl`에서 `page.map(...)` 반환값을 버려 DTO 매핑이 무효화되어 화면에 잘못된 데이터가 노출되었던 실제 버그.
- 컴파일러 경고도 IDE 경고도 없다 — 리뷰에서 놓치기 쉽다.

# Evidence
- 커밋 `c8b77573`: "fix: OssLicenseServiceImpl map() 결과 미적용 버그 수정. map() → forEach()로 변경".
- `documents/code_improvement_report.md` §1-1.

# How to apply
- Page 내용을 **변환**하려면 `var dtoPage = page.map(entity -> toDto(entity))` — 결과 변수 재할당 필수.
- Page 내용을 **수정**(sideffect)하려면 `page.forEach(...)` 또는 `page.getContent().forEach(...)` 사용.
- 코드리뷰 체크리스트: `.map(` 결과가 사용되지 않으면 즉시 지적.

# Counter / Caveats
- `Stream.map`은 중간 연산이라 소비되기 전에는 동작하지 않음 — Page와는 다르지만 "반환값을 써야 한다"는 원칙은 동일.
- `forEach`로 entity 필드를 변경할 땐 영속성 상태(detached/managed)에 따라 DB 반영이 달라짐을 주의.
