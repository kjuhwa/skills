---
name: openapi-customizer-property-name-enricher
description: Spring Boot springdoc 에서 DTO 코드를 수정하지 않고, OpenApiCustomizer 로 components.schemas 를 walk 하면서 property name 이 특정 패턴(resourceId, agentId 등)인 필드에 pattern + example + x-discovery-* 확장을 후처리 주입한다.
category: workflow
tags: [spring-boot, springdoc, openapi, customizer, cross-cutting, identifier, dto-zero-touch]
triggers:
  - "identifier field pattern 전수 부여"
  - "resourceId agentId 공통 확장"
  - "@Schema 없이 property enrichment"
  - "openapi customizer post-process"
source_project: lucida-domain-sms
version: 0.1.0-draft
---

# 언제 쓰는가

Swagger/OpenAPI 스펙의 **여러 DTO 에 반복 등장하는 property(예: `resourceId`, `agentId`, `confId`)** 에 공통 metadata(pattern, example, x-discovery-endpoint 등)를 부여해야 할 때. 일반적 방식은 DTO 마다 `@Schema(pattern=..., extensions=...)` 를 붙이는 것인데, 수백 개 DTO 를 일일이 건드리면 유지보수 지옥.

**대안**: `OpenApiCustomizer` 후처리 단계에서 `components.schemas` 를 순회하며 property name 매칭으로 일괄 주입한다. **DTO 코드 zero touch**.

# 언제 쓰지 말아야 하는가

- Property 별로 metadata 가 다른 경우 (예: 각 DTO 의 `resourceId` 가 서로 다른 discovery endpoint 를 가리켜야 함) → 이때는 DTO 각각에 `@Schema` 명시.
- Enum closing / complex schema transformation → 이건 Jackson mixin 이나 `@JsonTypeInfo` 영역.

# 핵심 구조

```java
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.media.Schema;
import org.springdoc.core.customizers.OpenApiCustomizer;

@Configuration
public class SchemaEnrichmentConfig {

  private static final Map<String, Map<String, String>> IDENTIFIER_META = Map.of(
      "resourceId", Map.of(
          "pattern", "^MA_.+$",
          "example", "MA_LINUX_TEST_SERVER_01",
          "x-discovery-endpoint", "/api/sms/hosts-filter",
          "x-discovery-field", "resourceId"),
      "agentId", Map.of(
          "pattern", "^MA_.+$",
          "example", "MA_ADServer_20250108202624",
          "x-discovery-endpoint", "/api/sms/agent/list-filter",
          "x-discovery-field", "agentId")
      // ... confId, customMonitorId 등
  );

  @Bean
  public OpenApiCustomizer enrichIdentifierFields() {
    return openApi -> {
      Components components = openApi.getComponents();
      if (components == null || components.getSchemas() == null) return;

      for (Schema<?> schema : components.getSchemas().values()) {
        @SuppressWarnings({"rawtypes", "unchecked"})
        Map<String, Schema> props = schema.getProperties();
        if (props == null) continue;

        for (Map.Entry<String, Schema> entry : props.entrySet()) {
          Map<String, String> meta = IDENTIFIER_META.get(entry.getKey());
          if (meta == null) continue;

          Schema<?> property = entry.getValue();
          if (property == null || !"string".equals(property.getType())) continue;

          if (property.getPattern() == null && meta.containsKey("pattern")) {
            property.setPattern(meta.get("pattern"));
          }
          if (property.getExample() == null && meta.containsKey("example")) {
            property.setExample(meta.get("example"));
          }
          property.addExtension("x-discovery-endpoint", meta.get("x-discovery-endpoint"));
          property.addExtension("x-discovery-field", meta.get("x-discovery-field"));
        }
      }
    };
  }
}
```

# 동작 원리

1. `springdoc` 이 컨트롤러/DTO 를 스캔하여 `components.schemas` 를 생성
2. 모든 `OpenApiCustomizer` Bean 이 **생성 후** 순차 실행
3. 본 Customizer 가 schemas 전체를 순회하며 property name 매칭 → metadata 주입
4. 최종 `/v3/api-docs` 에 enriched spec 노출

# 주의사항

1. **실행 순서 엄수**: 같은 Customizer 내에서 `addCanonicalEnums` 같은 schema 등록 메소드를 먼저, `enrichIdentifierFields` 류 walker 는 마지막. 등록된 schema 만 순회할 수 있기 때문.
2. **기존 값 보존**: `getPattern() == null` 체크 후에만 설정. DTO 에 이미 명시된 `@Schema(pattern=...)` 을 덮어쓰지 않기.
3. **type 체크**: `"string".equals(property.getType())` — 같은 이름이라도 string 이 아닌 필드(객체/배열)는 skip.
4. **확장은 덮어쓰기**: `addExtension` 은 기존 값 덮어쓰므로 필요 시 먼저 체크. discovery endpoint 는 덮어쓰는 게 의도적일 수 있음.
5. **성능**: schema 수백 개 × property 수십 개 = 수천 순회. Spring 기동 시 1회만 실행되므로 영향 없음.

# 검증 명령어

```bash
# bootRun 후 /v3/api-docs 덤프
curl -s http://localhost:59595/v3/api-docs > spec.json

# resourceId property 에 x-discovery-endpoint 가 주입됐는지
python -c "
import json
s = json.load(open('spec.json'))
hits = 0
for n, sc in s.get('components', {}).get('schemas', {}).items():
    for p, pd in (sc.get('properties') or {}).items():
        if p in ('resourceId','agentId','confId') and 'x-discovery-endpoint' in pd:
            hits += 1
print('enriched identifier fields:', hits)
"
```

# 확장 포인트

- **ID 이외 분야**: 같은 pattern 으로 `createdAt`/`updatedAt` 시간 필드 포맷 명시, `email`/`phone` 형식 주입, `color` 팔레트 enum 닫기 등에 응용 가능.
- **복잡 조건**: `entry.getKey()` 매칭 외에 schema name + property name 조합으로 더 정교한 룰 가능 (예: `HostDto.resourceId` 만 특정 discovery endpoint).
- **조건부 주입**: DTO 의 다른 property 값/타입에 따라 분기하는 경우 `schema.getProperties().get("confType")` 식으로 동일 schema 내 다른 property 참조 가능.

# 실제 사용 맥락

`lucida-domain-sms` 에서 #118871 "Swagger 최적화 sms V3" 작업으로 513 property 중 대부분에 `@Schema(title, description, requiredMode)` 가 이미 적용돼 있었다. 이 위에 `resourceId`/`agentId`/`confId`/`customMonitorId` 공통 discovery metadata 를 부여해야 했으나, 각 DTO 에 `@Schema(extensions=@Extension(name="x-discovery-endpoint", ...))` 를 추가하는 건 수백 파일 변경 → 본 Customizer 방식으로 **SwaggerExtensionConfig.java 한 파일만 추가**하여 해결. 관련 상위 스킬: `swagger-ai-optimization` Part D Phase 24.
