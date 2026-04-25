---
tags: [workflow, swagger, optimization]
name: swagger-ai-optimization
description: Spring Boot + springdoc 프로젝트의 Swagger/OpenAPI 스펙을 AI Agent용으로 최적화 (operationId, @Schema, @ApiResponse, x-filterable-fields, canonical enum + identifier DTO + typed response wrapper + 5 sidecar 파일 전수 적용)
category: workflow
version: 1.3.0
triggers:
  - swagger ai 최적화
  - openapi ai optimization
  - MCP 연동 준비
  - swagger operationId 전수 부여
  - AI 이해도 테스트
  - lucida 5 파일 전달물
  - polestar-per-endpoint
  - canonical enum x-label-ko
  - identifier DTO pattern
scope: user
---

# Swagger AI 최적화 워크플로우

Lucida 계열 Spring Boot 프로젝트에서 검증된 13단계 워크플로우. AI Agent(Claude, GPT, Gemini)가 스펙만 보고 API를 정확히 선택·호출하도록 스펙 품질을 B(30/36) → A+(36/36)로 끌어올린다.

## When to Activate

- Spring Boot 프로젝트에서 "Swagger 최적화", "OpenAPI AI 최적화", "MCP 연동 준비" 요청
- 컨트롤러에 @Operation만 있고 operationId/@Schema/@ApiResponse가 미적용 상태
- Lucida 프로젝트(lucida-domain-*, lucida-widget 등)의 AI 친화성 개선

## 프로젝트 사전 조건

- Spring Boot 3.x + springdoc-openapi (대부분 `lucida-framework-defaults-starter`에 포함)
- application.yml의 `spring.application.name` 확인 필수 (스펙 추출 경로에 사용)
- Gradle/Maven 빌드 가능 상태

## 13-Phase 워크플로우

```
Part A: 단일 프로젝트 최적화 (Phase 1~8)
  1. Before spec 추출 + 베이스라인 측정 (tiktoken)
  2. 5-Agent 병렬 분석 (보편/범용/실용/토큰/AI이해도)
  3. 구조 정리 — @Hidden, @SecurityScheme, operationId 전수
  4. 내용 보강 — description, @Parameter on @PathVariable, @ApiResponses
  5. DTO @Schema 전수 — description + example + format
  5-B. ApiResponseData<Object> 제네릭 응답 타입 실체화 (아래 별도 섹션 참조)
  6. After spec 추출 + 26개 AI 이해도 테스트
  7. Marp PPT 보고서
  8. CI/Prune/Prompt Caching/MCP (필수)

Part B: x-filterable-fields 확장 (Phase 9~13)
  9. lucida-ui 컬럼 정의 파싱 → { field, tt()키, filterType }
 10. lucida-meta messages_ko_kr.properties → 한국어 라벨 매핑
 11. x-filterable-fields 생성 및 @Extension 적용
 12. 응답 DTO title + enum 불일치 정정
 13. 검증 + GridFilter 정확도 재테스트

Part C: Polestar 스펙 확장 요청 반영 (Phase 14~18) — 2026-04-16 Lucida 팀 요청서 기반
 14. 열린 타입 닫기 — enum 닫기 + free-form object (arguments) 구조화
 15. 글로벌 x-* 4종 주입 — x-filter-vocabulary, x-tagfilter-grammar, x-timefilter-modes, x-error-codes
 16. x-resolver — path에 {x} 있는 엔드포인트에 id 출처 명시
 17. x-lookup — body 내 참조 필드(groupId, templateId 등)에 source endpoint 명시
 18. $ref closure 수정 — broken $ref 감사 및 수정

Part D: Polestar condensed 요청 (Phase 19~24) — 2026-04-24 Lucida 팀 2차 요청서 기반
 19. 5 파일 전달물 포맷 — polestar-openapi / per-endpoint / filterable-fields-mapping / measurement-catalog / i18n-ko
 20. Canonical enum 8종 + x-label-ko — AvailabilityStatusEnum, ManagementStatusEnum, MaintenanceStatusEnum, OsTypeEnum, IconEnum, ResourceTypeEnum, ScriptTypeEnum, ConfTypeEnum
 21. Identifier DTO (AgentId, ResourceId, HostnameId) — pattern + x-discovery-endpoint + x-discovery-field
 22. Typed error DTO 5종 — 400/401/403/404/500 별 ApiResponseDataXxx
 23. Typed response wrapper — ApiResponseDataPageHostDto / ApiResponseDataConfigurationDto 등 generic 실체화
 24. Identifier field 자동 enrichment — OpenApiCustomizer 후처리로 resourceId/agentId/confId/customMonitorId property 전수에 discovery metadata 주입
```

## Phase 5-B: ApiResponseData<Object> 제네릭 응답 타입 실체화

`public ApiResponseData<Object> xxx(...)` 시그니처는 Swagger 스펙에서 `data` 필드가 `Object`(빈 스키마)로 노출되어 AI Agent가 응답 구조를 추론할 수 없다. `ApiResponseData.createSuccess(X)` 의 `X` 실제 타입을 스펙에 노출해야 한다.

### 선택지 비교

| 방식 | 시그니처 | 장점 | 단점 |
|------|----------|------|------|
| **A. 시그니처 직접 변경** | `ApiResponseData<Object>` → `ApiResponseData<ActualType>` | 타입 안전성↑, springdoc가 자동 제네릭 스키마 생성, 보일러플레이트 0 | 컨트롤러/호출자 모두 영향, 연쇄 수정 필요 |
| **B. 마커 서브클래스 + @ApiResponse** | 그대로 유지 | 런타임 동작 무변경 | 타입별 마커 클래스 수십 개 생성, `@ApiResponse(content=@Content(schema=@Schema(implementation=XXX.class)))` 전수 추가 |
| **C. @ApiResponse + @Schema(implementation) 어노테이션만** | 그대로 유지 | 코드 무변경, 어노테이션만 추가 | 래퍼 구조 표현 제한적, 마커 클래스 불필요 |

권장: **C → 기본 (어노테이션만, 코드 무변경)**, **B → 정밀 스키마 필요 시**, **A → 코드 소유권이 있고 연쇄 영향 허용되는 프로젝트에만**.

> **실전 교훈 (Lucida 도메인)**: 방식 A를 적용했다가 "이 코드는 내가 관리하는 소스가 아니라 시그니처 변경 불가"라는 피드백으로 전량 롤백한 사례 있음. **반드시 사전에 코드 소유권/변경 범위를 사용자에게 확인**할 것. Swagger 최적화는 어노테이션(@Operation, @Schema, @ApiResponse 등)만 변경하는 것이 원칙이며, 메서드 시그니처/본문은 명시적 승인 없이 변경 금지.

### 공통 전제 조건 체크

1. `ApiResponseData.createSuccess(...)` / `createFail(...)` 이 제네릭 메서드인지 확인 (`<T> ApiResponseData<T> createSuccess(T data)` 형태여야 양쪽 모두 가능).
2. 컨트롤러 서로 호출하는 관계 파악 (방식 A 적용 시 연쇄 수정 대상). 예: `TestController` 같은 래퍼 컨트롤러가 다른 컨트롤러를 직접 호출.

### 방식 A 실행 절차

1. `grep -rn "public ApiResponseData<Object>" src/main/java/.../controller/` 로 전수 조사 → 파일별 건수 집계.
2. **반드시 파일 단위로 순차 처리**. 병렬 에이전트가 서로 다른 파일을 같은 시점에 편집하고 각자 빌드를 돌리면, 나중에 완료된 에이전트가 앞선 에이전트의 변경을 race condition으로 덮어쓰는 사례가 실측됨. 에이전트 1개 또는 파일별 엄격 락 사용.
3. 각 메서드 본문에서 `createSuccess(X)` 의 X 타입 추론 규칙:
   - `boolean/Boolean` → `Boolean`
   - `int/Integer/long/Long` → `Integer` / `Long`
   - `String` → `String`
   - `List<Foo>` / `Page<Foo>` / `Set<Foo>` → 동일
   - `Map<String, Object>` → 그대로 (실질적 실체화 불가)
   - DTO → 해당 DTO
   - **분기별로 서로 다른 구체 타입 반환** → `Object` 유지 + `@Schema(oneOf=...)` 고려
4. 메서드 시그니처만 Edit (본문/어노테이션/import 외 금지). 필요한 import 추가.
5. 파일 1개 완료 시마다 `./gradlew compileJava` 빌드 검증. 실패 시 해당 파일만 조정. 성공 후 다음 파일.
6. 호출자 컨트롤러(래퍼)는 마지막에 처리 — 호출 대상 시그니처가 확정된 뒤 맞춰 수정.

### 방식 C 실행 절차 (권장 기본값 — 코드 무변경)

시그니처를 `ApiResponseData<Object>` 그대로 두고, `@Operation`의 description에 응답 data 필드의 실제 타입과 주요 필드를 명시하는 방식.

1. `grep -rn "public ApiResponseData<Object>" src/main/java/.../controller/` 로 전수 조사.
2. 각 메서드 본문에서 `createSuccess(X)`의 X 실제 타입 추론 (방식 A와 동일 규칙).
3. `@Operation`의 `description`에 응답 구조 설명 추가:
   ```java
   @Operation(
     summary = "에이전트 목록 조회",
     operationId = "getAgentListByGridFilter",
     description = "... 응답 data: Page<AgentInfoDto> (agentId, hostName, ip, osType, agentVersion, startTime 등)"
   )
   public ApiResponseData<Object> getAgentListByGridFilter(...) { ... }
   ```
4. DTO에 `@Schema(description, example)` 가 이미 적용되어 있으므로, description에 DTO명만 명시하면 AI가 DTO 스키마를 참조하여 응답 구조를 추론 가능.
5. **절대 변경 금지**: 메서드 시그니처, 본문 로직, import (어노테이션 import 외).
6. 빌드 검증.

### 방식 B 실행 절차 (마커 서브클래스 — 정밀 스키마 필요 시)

1. `src/main/java/.../dto/swagger/` 에 마커 서브클래스 생성:
   ```java
   public class ApiResponseDataBoolean extends ApiResponseData<Boolean> {}
   public class ApiResponseDataPageAgentInfoDto extends ApiResponseData<Page<AgentInfoDto>> {}
   ```
2. 각 메서드에 `@ApiResponse` 추가:
   ```java
   @ApiResponse(responseCode = "200",
       content = @Content(schema = @Schema(implementation = ApiResponseDataBoolean.class)))
   public ApiResponseData<Object> registerX(...) { ... }
   ```
3. 마커 클래스 수 폭증 주의 — 유니크 타입 집계 후 일괄 생성.
4. 빌드 검증 동일.

### 실측 주의사항 (Lucida 도메인 실전)

- **코드 소유권 사전 확인 필수**: 방식 A(시그니처 변경)를 152건 적용 후 "관리 소스가 아니라 시그니처 변경 불가" 피드백으로 전량 롤백. Phase 5-B 시작 전 반드시 "시그니처 변경 허용 여부"를 사용자에게 확인. 허용 안되면 방식 C(어노테이션만) 적용.
- **롤백 시 private 메서드·래퍼 컨트롤러 주의**: 방식 A 롤백 시 public 시그니처만 되돌리면, private 헬퍼 메서드의 반환 타입이 불일치하여 컴파일 에러 발생. 이중 캐스트 `(ApiResponseData<Object>)(ApiResponseData<?>)` 같은 부산물이 삽입됨. private 메서드 시그니처도 함께 원복해야 함.
- **병렬 에이전트 race condition**: 15개 컨트롤러 병렬 위임 시 일부 파일 변경이 소실됨. Phase 5-B는 반드시 순차 처리.
- **Spring `PageImpl` 직렬화 경고**: `Page<T>` 반환 시 Jackson 경고가 뜨는 구조라면 이번 작업과 무관(기존부터 존재).
- **Swagger UI 캐시**: 변경 후 `springdoc` spec 재생성 경로(`/v3/api-docs`)로 확인. UI 페이지는 브라우저 캐시 제거 필요.

### 검증 명령어

```bash
# Object 잔여 확인
grep -rn "public ApiResponseData<Object>" src/main/java/**/controller/ | wc -l

# 빌드
./gradlew compileJava

# After spec에서 data 스키마 확인
python -c "import json; s=json.load(open('docs/swagger-after.json')); \
  [print(p,m,r['content']['application/json']['schema']) \
   for p,ms in s['paths'].items() for m,op in ms.items() \
   for c,r in op.get('responses',{}).items() if c=='200']" | grep -c '"\$ref"'
```

## 핵심 실행 전략: 병렬 에이전트 분산

대규모 프로젝트는 컨트롤러/DTO가 수십 개이므로 **반드시 병렬 에이전트로 분산**한다. 단일 에이전트로 200+ @Operation에 operationId를 추가하려 하면 중간에 멈추거나 품질이 저하된다.

### 분산 전략 (17개 컨트롤러 기준)

1. Agent/Config 컨트롤러 (27 ops)
2. CustomMonitor 컨트롤러 (62 ops — 별도 에이전트 할당)
3. CustomScript 컨트롤러 (27 ops)
4. Host/Measurement/MeasDef (32 ops)
5. 나머지 8개 컨트롤러 (52 ops)

DTO도 같은 전략으로 그룹화:
- Root DTO (~24 파일)
- configuration/ (7 파일)
- custommonitor/ + custommonitortemplate/ (20 파일)
- customscript/ (12 파일)

## ROI 우선순위 (실측 기반)

| 작업 | 실측 효과 | 투입 |
|------|:---------:|:----:|
| @Hidden (Dev 컨트롤러) | AI 후보 풀 -42%, L1 +3점 | 1줄 |
| @Schema (DTO 핵심 필드) | 파라미터 정확도 20%→100% | 10개 필드 |
| operationId 명시적 | 유사 API 구분 강화 | 1~128자, camelCase 동사+명사 |
| description "Use when/Do not use" | L2 +2점 | 50~80 단어 |
| @Parameter on @PathVariable | 타입 혼동 제거 | 2줄/필드 |

## 실전 팁

1. **@SecurityScheme은 새 클래스 만들지 말 것** — Bean 충돌(ConflictingBeanDefinitionException) 위험. 기존 `@Configuration` 클래스나 `@SpringBootApplication` 클래스에 어노테이션 추가.

2. **@Schema는 필드가 실제 선언된 클래스에 추가** — 상위 DTO가 아닌 중첩 엔티티에 선언된 필드는 해당 클래스에 직접 추가해야 spec에 반영됨.

3. **Windows Python 콘솔 인코딩** — `python -X utf8 스크립트.py` 사용. 그냥 실행하면 CP949 인코딩 오류 발생.

4. **토큰 50K 초과 시** — Prompt Caching 필수 (비용 80% 절감). 100K+면 MCP 서버로 분할 고려.

5. **tiktoken 정확도** — 근사치(len//4)는 Korean 텍스트에서 15~20% 과소평가. 정확한 측정에는 `pip install tiktoken` 필수.

## 핵심 검증 명령어

```bash
# Phase 3 검증
grep -rn 'operationId' src/main/java/**/controller/ | wc -l
grep -rn '@Hidden' src/main/java/**/controller/
grep -rn '@SecurityScheme' src/main/java/

# Phase 4 검증
grep -rn '@Parameter(description' src/main/java/**/controller/
grep -rn '@ApiResponses' src/main/java/**/controller/ | wc -l

# Phase 5 검증
grep -rn '@Schema' src/main/java/**/dto/ | wc -l

# 빌드
./gradlew compileJava

# 토큰 측정 (tiktoken 설치 후)
python -X utf8 scripts/measure-tokens.py docs/swagger-after.json
```

## 산출물 체크리스트

```
docs/
├── swagger-before.json
├── swagger-after.json
├── swagger-ai-test-prompt.md          ← 26개 시나리오
├── swagger-ai-test-results.md         ← Before/After 비교 표
├── swagger-ai-test-results-before.md  ← Before 상세
├── swagger-ai-test-results-after.md   ← After 상세
├── x-filterable-fields-mapping.json   ← Part B 매핑
└── report/
    ├── slides.md
    └── output.pptx

scripts/
├── measure-tokens.py
├── prune-swagger.py
└── prompt-caching-example.py

.github/workflows/openapi-quality-gate.yml
.spectral.yaml
```

## 등급 판정 기준

| 등급 | /36 | 판정 |
|:----:|:---:|------|
| A+ | 36 | MCP 연동 준비 완료 |
| A | 34-35 | 우수 |
| B | 30-33 | L2 개선 필요 |
| C | 26-29 | description 보강 필요 |
| D | ≤25 | 전면 재작업 |

A+ 미달 시 L3 파라미터 오답 항목의 @Schema description/example을 정밀 보강.

---

## Part C: Polestar 스펙 확장 요청 반영 (15개 작업 항목)

> **배경**: 2026-04-16 Lucida 팀(jhjang@nkia.co.kr)이 Polestar API 팀에 전달한 스펙 확장 요청서(`docs/polestar_api_spec_extension_request/`)의 15개 항목. LLM이 `gridFilters`/`tagFilters` payload를 자급자족 조립할 수 있도록 OpenAPI 스펙을 강화한다. 기존 Phase 1~13과 상당 부분 겹치지만 **열린 타입 닫기·글로벌 x-*·x-resolver·x-lookup·$ref closure**는 Part C 고유 항목.

### 전체 15개 요약 (Coverage target)

| 작업 | 적용 범위 | 목표 | cards_v2 상태 |
|---|---|---|---|
| 4.1.1 summary + description | 모든 endpoint | 100% | 🟡 64% |
| 4.1.2 requestBody.example | body 있는 endpoint | 100% | 🟡 23% |
| 4.1.3 response.example | 모든 endpoint | 100% | 🟡 57% |
| 4.1.4 `required: []` 실제 값 | body 있는 endpoint | 100% | 🟡 14% |
| **4.1.5 열린 타입 닫기** | 전수 발굴 | 100% | ❌ |
| 4.1.6 property 한글 설명 | 모든 property | 100% | 🟡 |
| 4.1.7 discriminator + oneOf | polymorphic body | 100% | 🟡 |
| **4.2.1 x-filter-vocabulary** | 글로벌 1회 | ✅ | 복사 |
| **4.2.2 x-tagfilter-grammar** | 글로벌 1회 | ✅ | 복사 |
| **4.2.3 x-timefilter-modes** | 글로벌 1회 | ✅ | 복사 |
| **4.2.4 x-error-codes** | 글로벌 1회 | ✅ | 복사 |
| 4.3.1 x-filterable-fields | list-shaped endpoint | 100% | 🟡 (Part B에서 처리) |
| **4.3.2 x-resolver** | path-param endpoint | 100% | 🟡 20% |
| **4.4.1 x-lookup** | body 참조 필드 | 100% | ❌ |
| **4.5.1 `$ref` closure 수정** | 지명 모듈 | 100% | ❌ |

### Phase 14: 열린 타입 닫기 (4.1.5) — **핵심**

**(a) enum 닫기** — `type: string`/`integer`로 선언됐으나 실제로는 유한 값 집합인 필드. 예: `confType`, `resourceType`, `permission`, `status`, `alarmSeverity`, `operator`.

```java
// Before
private Integer permission;

// After
@Schema(
    description = "권한 레벨",
    type = "integer",
    allowableValues = {"1", "3", "5", "7", "9"},
    example = "5")
private Integer permission;
```

**(b) free-form object 닫기** — `additionalProperties: {}` 대신 endpoint별 named property 정의. 대표 사례: `FiltersPageableDto.arguments`.

- 전략 1 (공유 DTO 변경 불가): endpoint별 **서브클래스** 또는 **@Schema(implementation=...)** 로 마커 DTO 노출
- 전략 2 (소유권 있음): `arguments` 를 구체 DTO로 교체

```java
// endpoint별 마커 DTO
public class HostsFilterArguments {
    @Schema(description = "최소 권한", allowableValues = {"1","3","5","7","9"})
    private Integer permission;
    @Schema(description = "중지 장비 포함")
    private Boolean includeSuspended;
}
```

### Phase 15: 글로벌 x-* 4개 주입 (4.2.1~4.2.4)

cards_v2의 `x-lucida-*` 키를 그대로 **접두어 없는 `x-*`** 로 OpenAPI document 최상위에 삽입. Spring Boot에서는 `OpenApiCustomizer` Bean으로 주입.

```java
@Configuration
public class SwaggerExtensionConfig {

    @Bean
    public OpenApiCustomizer globalExtensions() {
        return openApi -> {
            openApi.addExtension("x-filter-vocabulary", Map.of(
                "operator_sets", Map.of(
                    "Text",        List.of("contains","equals","startsWith","endsWith","notContains"),
                    "Number",      List.of("equals","greaterThan","lessThan","inRange"),
                    "DateRange",   List.of("inRange"),
                    "SelectMulti", List.of("equals"),
                    "ManageStatus",List.of("equals")
                ),
                "case_sensitive", false
            ));
            openApi.addExtension("x-tagfilter-grammar", Map.of(
                "operators", List.of("AND","OR","NOT","=","!=","LIKE"),
                "wildcards_allowed", true,
                "quoted_values", true,
                "parentheses", true,
                "case_sensitive", false,
                "examples", List.of(
                    "confType = server",
                    "confType = server AND os LIKE \"%linux%\""
                )
            ));
            openApi.addExtension("x-timefilter-modes", Map.of(
                "valid_modes", List.of("LIVE","MIN_15","MIN_30","HOUR","HOUR_3","NOW",
                                        "TODAY","DAY_3","WEEK","MONTH","MONTH_3","MONTH_6","YEAR","CUSTOM"),
                "recommended_usage", Map.of(
                    "short_range", "LIVE, MIN_15, MIN_30",
                    "long_range",  "CUSTOM with explicit startTime/endTime (ms epoch)"
                )
            ));
            openApi.addExtension("x-error-codes", Map.of(
                "POLESTAR_00000", "성공",
                "POLESTAR_00006", "잘못된 파라미터",
                "POLESTAR_00500", "내부 서버 오류"
                // ... 145개 전체
            ));
        };
    }
}
```

### Phase 16: x-resolver (4.3.2) — path-param 엔드포인트

path에 `{x}` 있는 엔드포인트에 "그 id를 어디서 가져오는지" 명시. springdoc의 `@Extension` 사용.

```java
@Operation(
    summary = "리소스 기본정보 조회",
    operationId = "getBasicInfo",
    extensions = @Extension(name = "x-resolver", properties = {
        @ExtensionProperty(name = "param",    value = "resourceId"),
        @ExtensionProperty(name = "endpoint", value = "/api/sms/hosts-filter"),
        @ExtensionProperty(name = "field",    value = "data.content[].resourceId"),
        @ExtensionProperty(name = "example_value", value = "MA_LINUX_01")
    })
)
@PostMapping("/configuration/{resourceId}/basic-info")
public ApiResponseData<Object> getBasicInfo(@PathVariable String resourceId) { ... }
```

### Phase 17: x-lookup (4.4.1) — body 내 참조 필드

DTO property 중 다른 엔티티 id를 참조하는 필드(`groupId`, `templateId`, `metricDefinitionId`, `roleId` 등)에 source endpoint 명시. 속성 레벨 `@Extension`은 `@Schema(extensions=...)`로 표현.

```java
public class AlarmPolicyDto {

    @Schema(
        description = "리소스 그룹 ID",
        extensions = @Extension(name = "x-lookup", properties = {
            @ExtensionProperty(name = "endpoint",    value = "/api/account/group/list-page-filter"),
            @ExtensionProperty(name = "field",       value = "data.content[].groupId"),
            @ExtensionProperty(name = "label_field", value = "data.content[].groupName")
        })
    )
    private String resourceGroupId;

    @Schema(
        description = "측정 지표 정의 ID",
        extensions = @Extension(name = "x-lookup", properties = {
            @ExtensionProperty(name = "endpoint",     value = "/api/measurement/definitions"),
            @ExtensionProperty(name = "field",        value = "data[].definitionId"),
            @ExtensionProperty(name = "filter_hint", value = "resourceType + alias로 필터링")
        })
    )
    private String metricDefinitionId;
}
```

### Phase 18: $ref closure 수정 (4.5.1)

`components.schemas` 미참조로 broken된 `$ref` 를 감사. 주 증상은 requestBody/responseBody가 `object`(빈 스키마)로 노출되는 것. 원인은 대부분 **framework(lucida-common) DTO를 상속·wrapping하면서 springdoc가 추적 실패**.

**감사 스크립트**:
```python
import json
spec = json.load(open('docs/swagger-after.json'))
schemas = spec.get('components', {}).get('schemas', {})
broken = []
for p, methods in spec['paths'].items():
    for m, op in methods.items():
        rb = op.get('requestBody', {}).get('content', {}).get('application/json', {}).get('schema')
        if rb and '$ref' in rb:
            name = rb['$ref'].split('/')[-1]
            if name not in schemas:
                broken.append((p, m, name))
print(f"Broken $refs: {len(broken)}")
for b in broken[:20]:
    print(b)
```

**해결**: @Schema(implementation=XxxDto.class) 를 @RequestBody/응답에 명시, 또는 framework 측에 DTO가 정식 export되도록 요청.

### Part C 검증 (audit.py 유사)

```bash
# 4.1.5 enum 닫기
python -X utf8 -c "
import json
s = json.load(open('docs/swagger-after.json'))
opens = []
for n, sc in s.get('components', {}).get('schemas', {}).items():
    for p, pd in (sc.get('properties') or {}).items():
        if pd.get('type') in ('string','integer') and 'enum' not in pd and 'allowableValues' not in pd:
            opens.append((n, p))
print('open-type fields:', len(opens))
"

# 4.2 글로벌 x-* 존재
python -X utf8 -c "
import json
s = json.load(open('docs/swagger-after.json'))
for k in ['x-filter-vocabulary','x-tagfilter-grammar','x-timefilter-modes','x-error-codes']:
    print(k, '✅' if k in s else '❌')
"

# 4.3.2 x-resolver coverage
python -X utf8 -c "
import json, re
s = json.load(open('docs/swagger-after.json'))
total, has = 0, 0
for p, ms in s['paths'].items():
    if not re.search(r'\{[^}]+\}', p): continue
    for m, op in ms.items():
        total += 1
        if 'x-resolver' in op: has += 1
print(f'x-resolver: {has}/{total}')
"

# 4.4.1 x-lookup coverage (ID 참조 field 중 x-lookup 있는 비율)
python -X utf8 -c "
import json, re
s = json.load(open('docs/swagger-after.json'))
id_re = re.compile(r'(Id|ID|Ids)$')
total, has = 0, 0
for n, sc in s.get('components', {}).get('schemas', {}).items():
    for p, pd in (sc.get('properties') or {}).items():
        if id_re.search(p):
            total += 1
            if any(k.startswith('x-lookup') for k in pd): has += 1
print(f'x-lookup: {has}/{total}')
"
```

### Part C 실전 교훈

- **공유 DTO는 수정 금지**. `FiltersPageableDto`, `GridFilterDto` 등 lucida-common 모듈에 있는 DTO는 이 프로젝트에서 직접 변경 불가. 대신 각 domain 모듈에서 **wrapping DTO**를 만들거나 `@Schema(implementation=...)` 로 구체 스키마를 덮어쓴다.
- **글로벌 x-*는 프레임워크에 한 번만**. lucida-framework에 `OpenApiCustomizer`를 두고 domain 모듈은 빈 재등록 없음. 없다면 domain별 Config에 임시로 두되 중복되지 않도록 `@ConditionalOnMissingBean` 또는 `@Primary` 검토.
- **x-resolver/x-lookup 접두어 명명**: cards_v2 내부는 `x-lucida-*` 이나 정식 스펙은 `x-*` (lucida 접두어 제거). 본 스킬은 정식 스펙 스타일 준수.
- **$ref closure 감사는 module-by-module**. `domain-itg`, `snote`, `rulechain` 등 특정 모듈에만 broken 케이스 집중. 감사 후 해당 팀에 티켓.

---

## Part D: Polestar condensed 요청 반영 (5 파일 전달물 + canonical/identifier/typed wrapper)

> **배경**: 2026-04-24 Lucida 팀의 condensed 요청서 (`docs/lucida_ask_condensed.ko.pdf`). 1차 요청(Part C)이 "스펙 확장 체크리스트"였다면, 2차는 "LLM이 user query 하나로 payload 조립 + 응답 파싱 + 한글 UI 렌더링"을 자급자족하도록 요구되는 **5개 최종 산출 파일 포맷**을 명시. Part C의 하위 요구를 **엔드투엔드 산출물 형태**로 재정의한 것이 특징.

### 5 파일 전달물 맵 (Phase 19)

| # | 파일 | 용도 | 충족 원천 |
|---|---|---|---|
| ① | `docs/polestar-openapi.json` | 공용 DTO + enum + error DTO spec | Springdoc `/v3/api-docs` 덤프 |
| ② | `docs/polestar-per-endpoint.json` | endpoint 별 request/arguments/tag/time/grid/response 제약 | 컨트롤러 스캔 → JSON 생성 |
| ③ | `docs/polestar-filterable-fields-mapping.json` | 22+ grid column 정의 + 한글 라벨 + filterType + sortable | Part B에서 생성된 `x-filterable-fields-mapping.json` 리네임 |
| ④ | `docs/polestar-measurement-catalog.json` | resource_types 133종 + metric compound ID → 한글 매핑 | `MeasurementDefinitionController` 런타임 데이터 |
| ⑤ | `docs/polestar-i18n-ko.json` | enum_labels / error_codes / menu / filter_types / operators | SwaggerExtensionConfig + SmsErrorCode 기반 |

**검증 3 질문** (PDF 페이지 6):
1. 파일 ①② 만으로 payload 조립 가능한가 → ✓ (공용 DTO + endpoint 별 제약)
2. 파일 ①③⑤ 만으로 응답을 한글 UI로 렌더링 가능한가 → ✓ (typed response + grid + enum 한글)
3. 파일 ①② 의 x-discovery-endpoint/path_params 만으로 multi-hop chain 가능한가 → ✓ (identifier → source endpoint 체인)

### Phase 20: Canonical enum 8종 + x-label-ko

Spring Boot에서 Java enum 클래스를 직접 수정하지 않고 `OpenApiCustomizer`로 `components.schemas` 에 주입하는 것이 **원칙**. Java enum을 건드리면 기존 컴파일러/Jackson/서비스 로직 전부 영향을 받는다.

```java
private static Schema<String> stringEnum(List<String> values, Map<String, String> labelKo, String description) {
    StringSchema schema = new StringSchema();
    schema.setDescription(description);
    schema.setEnum(values);
    schema.addExtension("x-label-ko", labelKo);
    return schema;
}

components.addSchemas("AvailabilityStatusEnum",
    stringEnum(
        List.of("UP", "DOWN", "UNKNOWN"),
        Map.of("UP", "정상", "DOWN", "다운", "UNKNOWN", "알수없음"),
        "가용성 상태 (에이전트 수집 여부)"));
```

**8 canonical enum 고정 리스트** (SMS 도메인 기준, 다른 도메인은 appended list):
- `AvailabilityStatusEnum` — UP/DOWN/UNKNOWN (+ WARNING/CRITICAL/NORMAL 광의)
- `ManagementStatusEnum` — MANAGED/UNMANAGED
- `MaintenanceStatusEnum` — NONE/PLANNED/IN_PROGRESS
- `OsTypeEnum` — AIX/HPUX/LINUX/SUNOS/WINDOWS
- `IconEnum` — logo-aix-f/logo-hp-f/logo-sun-os-o/logo-windows-f/logo-linux-o
- `ResourceTypeEnum` — server/network/database/middleware/application
- `ScriptTypeEnum` — DEFAULT/SHELL/VB_SCRIPT/WINDOWS_POWERSHELL/WINDOWS_BATCH
- `ConfTypeEnum` — server (도메인별 확장)

### Phase 21: Identifier DTO (AgentId / ResourceId / HostnameId)

단순 `String resourceId` 를 `pattern` + `example` + `x-discovery-endpoint` + `x-discovery-field` 로 감싸는 식별자 전용 schema. LLM이 "ResourceId 가 필요하다" → "/api/sms/hosts-filter 를 호출하여 data.content[].resourceId 를 얻는다" 를 결정적으로 체인 가능.

```java
private static Schema<String> identifier(String pattern, String example,
    String discoveryEndpoint, String discoveryField, String description) {
    StringSchema schema = new StringSchema();
    schema.setDescription(description);
    schema.setPattern(pattern);
    schema.setExample(example);
    schema.addExtension("x-discovery-endpoint", discoveryEndpoint);
    schema.addExtension("x-discovery-field", discoveryField);
    return schema;
}

components.addSchemas("ResourceId", identifier(
    "^MA_.+$",
    "MA_LINUX_TEST_SERVER_01",
    "/api/sms/hosts-filter",
    "resourceId",
    "리소스 ID (서버/DB 등 모니터링 대상 고유 식별자)"));
```

**Pattern은 느슨하게**. 레거시(`MA_LINUX_TEST_SERVER_01`)와 신규(`MA_ADServer_20250108202624`) 가 혼재하므로 `^MA_.+$` 가 안전. 타이트한 `^MA_.+_\d{14}$` 는 레거시에서 validation fail.

### Phase 22: Typed error DTO 5종

status code별로 error DTO 분리. 각 DTO는 `success=false` + `errorCode` enum + `message` 한글 + `errorData` 진단. `suggestedDiscoveryEndpoint` 처럼 LLM이 다음 액션을 유추할 힌트 포함.

```java
private static Schema<?> errorDto(List<String> errorCodeEnum, String description) {
    ObjectSchema dto = new ObjectSchema();
    dto.setDescription(description);
    dto.addProperty("success", new Schema<Boolean>().type("boolean"));
    dto.addProperty("errorCode", new StringSchema().setEnum(errorCodeEnum));
    dto.addProperty("message", new StringSchema());
    ObjectSchema errorData = new ObjectSchema();
    errorData.addProperty("suggestedDiscoveryEndpoint", new StringSchema());
    dto.addProperty("errorData", errorData);
    return dto;
}

components.addSchemas("ApiResponseDataBadRequest",
    errorDto(List.of("MISSING_PARAMETER", "INVALID_FILTER_FIELD", "INVALID_OPERATOR", "INVALID_ENUM_VALUE"),
            "400 Bad Request — 파라미터 검증 실패"));
```

### Phase 23: Typed response wrapper

Phase 5-B의 "방식 A/B/C" 중 **방식 C 변형** — 시그니처/DTO 수정 없이 `OpenApiCustomizer`로만 wrapper schema 등록. 가장 비파괴적.

```java
private static Schema<?> typedPagedResponse(String itemSchemaName, String description) {
    ObjectSchema wrapper = new ObjectSchema();
    wrapper.setDescription(description);
    wrapper.addProperty("success", new Schema<Boolean>().type("boolean"));
    wrapper.addProperty("errorCode", new StringSchema().nullable(true));

    ObjectSchema data = new ObjectSchema();
    ArraySchema content = new ArraySchema();
    content.setItems(new Schema<>().$ref("#/components/schemas/" + itemSchemaName));
    data.addProperty("content", content);
    data.addProperty("totalElements", new IntegerSchema().format("int64"));
    wrapper.addProperty("data", data);
    return wrapper;
}

components.addSchemas("ApiResponseDataPageHostDto",
    typedPagedResponse("HostDto", "호스트 목록 페이지 응답"));
```

**핵심 wrapper 목록** (SMS 도메인 기준):
- `ApiResponseDataPageHostDto` / `PageAgentInfoDto` / `PageStandByHostDto` / `PageCustomMonitorDto` / `PageCustomScriptDto`
- `ApiResponseDataConfigurationDto` / `MeasurementDetailsDto` / `HostInformationDto`
- `ApiResponseDataListOracleSession` (envelope=array)

### Phase 24: Identifier 필드 자동 enrichment (핵심 혁신)

DTO 수백 개에 일일이 `@Schema(implementation = ResourceId.class)` 를 붙이는 것은 **유지보수 불가**. 대신 **OpenApiCustomizer 단계에서 스키마 전체를 walk** 하면서 property name이 `resourceId`/`agentId`/`confId`/`customMonitorId` 인 `type: string` 필드를 발견할 때마다 pattern+example+extension을 **후처리 주입**한다. DTO 코드는 zero touch.

```java
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
        "x-discovery-field", "agentId"),
    // confId, customMonitorId 등
);

@SuppressWarnings({"rawtypes", "unchecked"})
private static void enrichIdentifierFields(Components components) {
    if (components.getSchemas() == null) return;
    for (Schema<?> schema : components.getSchemas().values()) {
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
}
```

**효과**: DTO 변경 없이 전 spec 의 식별자 필드가 즉시 자급자족 payload 조립용 metadata 획득. 후처리라 기존 `@Schema` 존재 여부 무관.

### Part D 실전 교훈

1. **2,883 endpoint는 전사 범위**. 단일 domain-sms 서비스는 SMS scope (약 200 endpoint) 만 담당. DPM/KCM/NMS는 각 repo 책임. 5개 파일은 "이 repo가 만든 SMS scope partial → Lucida 팀이 cross-domain merge" 구조로 위임.

2. **기존 @Schema 유무 먼저 확인**. #118871 "Swagger 최적화 sms V3" 같은 선행 작업이 있는 경우, DTO 전수 @Schema 주석이 이미 적용되어 있을 확률 높음. 병렬 subagent로 확인 → **수정 불필요** 판정이면 Phase 20+ 로 바로 이동.

3. **OpenApiCustomizer 순서 주의**. `addCanonicalEnums` → `addIdentifierDtos` → `addCommonFilterDtos` → `addTypedErrorDtos` → `addTypedResponseWrappers` → `enrichIdentifierFields` **순서 엄수**. enrichIdentifierFields 가 앞쪽 schema 등록 결과를 walk 하므로 **항상 마지막**.

4. **Swagger `Schema<Boolean>` type 지정법**. `new Schema<Boolean>().type("boolean")` 은 OK. `BooleanSchema` 클래스도 있으나 패키지별 누락 가능 — Schema 베이스로 type 지정이 가장 호환성 높음.

5. **`setAdditionalProperties(true)` vs `new ObjectSchema()`**. `arguments` 같은 free-form 필드는 `true` 로 선언하되, Part C Phase 14(b)의 "endpoint별 closing" 과는 다른 층위. OpenApiCustomizer의 공용 DTO 는 true 유지, 실제 endpoint의 `arguments` 닫기는 per-endpoint.json 에서 처리.

6. **per-endpoint.json entry 확장**. 200 endpoint 전수 확장은 subagent executor 1개에 `@RequestMapping` 기반 path prefix 매핑을 명시하고 일괄 위임. 컨트롤러별 병렬 분할은 class-level prefix 중복 오류 많음 — 단일 agent 로 한 파일 순회가 안전.

### Part D 검증 명령어

```bash
# 5 파일 존재 확인
for f in polestar-openapi.json polestar-per-endpoint.json \
         polestar-filterable-fields-mapping.json \
         polestar-measurement-catalog.json polestar-i18n-ko.json; do
  test -f "docs/$f" && echo "✅ $f" || echo "❌ $f"
done

# per-endpoint.json entry 수
python -c "import json; d=json.load(open('docs/polestar-per-endpoint.json', encoding='utf-8')); print('entries:', len(d)-1)"

# canonical enum / identifier / typed wrapper 스펙 노출 확인 (bootRun 후)
curl -s http://localhost:59595/v3/api-docs | python -X utf8 -c "
import json, sys
s = json.load(sys.stdin)
schemas = s.get('components', {}).get('schemas', {})
for name in ['AvailabilityStatusEnum','OsTypeEnum','ResourceId','AgentId',
             'ApiResponseDataBadRequest','ApiResponseDataPageHostDto']:
    print(name, '✅' if name in schemas else '❌')
"

# i18n-ko.json 섹션 완결성
python -c "
import json
d = json.load(open('docs/polestar-i18n-ko.json', encoding='utf-8'))
for section in ['enum_labels','error_codes','menu','filter_types','operators']:
    print(section, '✅' if section in d and d[section] else '❌')
"
```

### Part D 산출물 추가 체크리스트

기존 Part A/B 체크리스트에 다음 5 파일 + Java config 추가:

```
docs/
├── polestar-openapi.json                     ← Part D ①
├── polestar-per-endpoint.json                ← Part D ② (200 entry/SMS)
├── polestar-filterable-fields-mapping.json   ← Part D ③ (= Part B 결과물 리네임)
├── polestar-measurement-catalog.json         ← Part D ④
├── polestar-i18n-ko.json                     ← Part D ⑤
└── lucida_ask_condensed.ko.pdf               ← 원본 요청서

src/main/java/.../config/
└── SwaggerExtensionConfig.java               ← Phase 15 (Part C) + Phase 20~24 (Part D) 통합
```
