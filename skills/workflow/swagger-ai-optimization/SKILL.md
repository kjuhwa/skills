---
name: swagger-ai-optimization
description: Spring Boot + springdoc 프로젝트의 Swagger/OpenAPI 스펙을 AI Agent용으로 최적화 (operationId, @Schema, @ApiResponse, x-filterable-fields 전수 적용)
triggers:
  - swagger ai 최적화
  - openapi ai optimization
  - MCP 연동 준비
  - swagger operationId 전수 부여
  - AI 이해도 테스트
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
