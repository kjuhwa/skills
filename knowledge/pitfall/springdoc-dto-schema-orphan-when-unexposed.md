---
version: 0.1.0-draft
name: springdoc-dto-schema-orphan-when-unexposed
description: springdoc는 컨트롤러 시그니처를 walk하므로 ApiResponseData<Object> 반환 DTO에 달린 @Schema·x-lookup은 스펙에 반영되지 않는다
category: pitfall
tags:
  - springdoc
  - openapi
  - java
  - schema
  - swagger-ai-optimization
---

# springdoc-dto-schema-orphan-when-unexposed

DTO 필드에 `@Schema(description, example, extensions = @Extension(...))` 를 꼼꼼히 달았는데 `/v3/api-docs`(또는 저장한 `swagger-after.json`)을 확인하면 해당 DTO가 `components.schemas` 에 **아예 없거나 빈 `{}`** 로 노출된다. x-lookup, x-enum 등 확장이 전부 무시된 것처럼 보인다. 빌드는 성공하고 Swagger UI만 봐도 모양이 그럴듯해서 금방 알아채기 어렵다.

원인은 `springdoc-openapi` 의 walker 구조다. springdoc는 컨트롤러 메서드의 `@RequestBody` 파라미터 타입과 **반환 타입**을 시작점으로 타입 그래프를 walk 하며 스키마를 수집한다. Lucida 도메인 프로젝트에서 흔한 `public ApiResponseData<Object> xxx(...)` 시그니처는 반환 타입이 `Object` 로 지워져 있어 walker가 내부 `ApiResponseData.createSuccess(X)` 의 실제 타입을 추적하지 못한다. 이 경로로만 사용되는 DTO는 컨트롤러 어디에도 참조되지 않으므로 **아무리 annotation 을 달아도 스펙에 절대 등장하지 않는다.** 실전 사례: `ConfigurationDto.groupId` 에 `x-lookup` 을 걸었지만 `components.schemas.ConfigurationDto` 자체가 스펙에 존재하지 않아 100% 무효였고, 같은 내용을 실제 엔드포인트 응답 경로에 포함된 `HostInformationDto.groupId` 로 옮기고서야 노출됐다.

대응은 **annotation 대량 투하 전 스펙 노출 여부 선검증**이다. 타겟 필드 이름(`groupId` 등)으로 spec JSON을 검색해서 실제로 노출된 DTO 이름을 먼저 추린다:

```python
import json
s = json.load(open('docs/swagger-after.json', encoding='utf-8'))
target_field = 'groupId'
for n, sc in s.get('components', {}).get('schemas', {}).items():
    if target_field in (sc.get('properties') or {}):
        print(f'exposed: {n}')
```

노출 안 된 DTO에 annotation 다는 작업은 "미래를 위한 문서화"는 될지언정 **현 스펙 품질 개선에는 기여 0** 이다. ROI 관점에서는 (1) 노출된 DTO에만 annotation 투자, (2) 노출 안 된 DTO는 Phase 5-B 수준(시그니처 실체화 또는 `@Schema(implementation=MarkerDto.class)` 마커 노출)을 선행한 뒤에 annotation을 붙인다. 체크리스트 3항: 컨트롤러 반환 타입이 `ApiResponseData<Object>`인가 → `@Schema(implementation=...)` 마커 노출이 있나 → 스펙 JSON에서 해당 DTO가 `properties: {...}` 로 채워졌나. 세 가지를 모두 확인한 뒤 annotation 투하.
