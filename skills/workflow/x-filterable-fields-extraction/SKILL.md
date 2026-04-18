---
tags: [workflow, filterable, fields, extraction]
name: x-filterable-fields-extraction
description: OpenAPI 스펙에 x-filterable-fields 확장을 자동 생성하는 파이프라인. lucida-ui gridColumnDefs + lucida-meta i18n properties를 조합하여 필드명/한국어 title/operators를 추출
triggers:
  - x-filterable-fields
  - 필터 가능 필드 추출
  - gridFilters 메타데이터
  - tagFilters 메타데이터
  - 리소스 키 추출
  - GridFilter 정확도 개선
scope: user
category: workflow
version: 1.0.0
---

# x-filterable-fields 자동 추출 파이프라인

AI가 `gridFilters`/`tagFilters`의 필드명, 한국어 라벨, 허용 operator를 알 수 있도록 OpenAPI 스펙에 `x-filterable-fields` 확장을 자동 생성하는 파이프라인. 3개 프로젝트(lucida-ui, lucida-meta, 백엔드 모듈)의 데이터를 조합한다. GridFilter 정확도 29% → 80%+ 개선 목표.

## When to Activate

- OpenAPI 스펙에 `x-filterable-fields` 추가 요청
- LLM이 필터 API 호출 시 빈 배열 반환하는 문제 해결
- `FiltersPageableDto` 사용 엔드포인트의 필드 메타데이터 필요
- GridFilter 정확도 개선 작업
- Swagger AI 최적화 Phase 9~13 (`swagger-ai-optimization` 스킬의 연장선)

## Data Chain (3개 프로젝트)

```
lucida-ui (프론트엔드 테이블 컬럼 정의)
  shared/constants/{domain}/gridColumnDefs.ts
    → { field, headerName/displayName, filter타입 }
                ↓ tt() 키
lucida-meta (백엔드 i18n 메시지)
  src/main/resources/META-INF/messages_ko_kr.properties
    → cmm.xxx = 한국어 라벨
                ↓ 조합
각 백엔드 모듈 OpenAPI 스펙
  x-filterable-fields 삽입 (grid + tags)
```

## 워크플로우

### Step 1: lucida-ui gridColumnDefs 파싱

**대상:** `shared/constants/{sms,dpm,apm,nms,...}/gridColumnDefs.ts`

**추출 패턴 3가지:**

```typescript
// 패턴 A: tt() 함수 — 가장 일반적
{ field: 'hostname', headerName: tt('cmm.system_name'), filter: GridFilter.Text }
  → { field: "hostname", ttKey: "cmm.system_name", filterType: "Text" }

// 패턴 B: raw 문자열 — tt 없이 직접
{ field: 'ip', headerName: 'IP', filter: GridFilter.Text }
  → { field: "ip", rawLabel: "IP", filterType: "Text" }

// 패턴 C: displayName 사용
{ field: 'availabilityStatus', displayName: tt('cmm.availability_status') }
  → { field: "availabilityStatus", ttKey: "cmm.availability_status" }
```

**Regex 예시:**
```
field:\s*['"]([^'"]+)['"]
(headerName|displayName):\s*tt\(['"]([^'"]+)['"]\)
filter:\s*(?:columnGridFilter\([^,]+,\s*)?['"]?(Text|Number|ManageStatus)['"]?
```

### Step 2: lucida-meta i18n 매핑

**대상:** `src/main/resources/META-INF/messages_ko_kr.properties` (표준 Java properties)

**확인된 매핑 예시:**
```
cmm.system_name=시스템 이름
cmm.cpu_usage_rate=CPU 사용률
cmm.memory_usage_rate=메모리 사용률
cmm.availability=가용성
cmm.disk_io_throughput=디스크 I/O 처리율
cmm.traffic_rx=트래픽 Rx
```

Step 1의 `ttKey`를 이 파일에서 조회하여 한국어 라벨로 치환.

### Step 3: filterType → operators 자동 매핑

```
Text         → [equals, notequals, contains]
Number       → [equals, greaterthan, lessthan, greaterthanequals, lessthanequals, between]
ManageStatus → [equals, in]
```

### Step 4: endpoint 매핑

**소스 우선순위:**
1. `menu_api_mapping.json` (기존 수동 매핑, 있다면 활용)
2. `shared/apis/endpoint/{domain}EndPoint.ts` (endpoint 상수)
3. 컴포넌트 코드 추적 (`Grid → endpoint`)

### Step 5: x-filterable-fields 생성

```yaml
"/api/sms/hosts-filter":
  post:
    x-filterable-fields:
      grid:
        - field: hostname
          title: 시스템 이름
          operators: [contains, equals]
          valueType: string
        - field: cpuUtil
          title: CPU 사용률
          operators: [greaterthan, lessthan, equals]
          valueType: number
      tags:
        - key: confType
          title: 구성 타입
          enum: [server]
        - key: 환경
          title: 환경
          enum: [운영, 개발, 테스트]
```

### Step 6: OpenAPI 스펙에 적용

**방법 A:** OpenAPI JSON/YAML에 직접 삽입 (즉시 적용)
**방법 B:** 커스텀 어노테이션 + OperationCustomizer로 자동 동기화
**방법 C:** 빌드 시 별도 JSON과 병합 (하이브리드)

## 핵심 규칙

1. **headerName 빈 문자열 처리**: `headerName: ''`인 경우 `displayName` 또는 `tt()` 키 우선
2. **raw vs tt() 혼재**: 같은 파일에서 두 패턴이 섞여 있음 → 둘 다 처리
3. **tagFilters 허용값**: 백엔드 상수/설정에 의존 → 기존 `menu_api_field.json`의 `default_filter` 활용
4. **filterType 미지정**: `columnGridFilter(...)` 헬퍼 함수 사용 시 인자에서 추출
5. **중첩 헬퍼**: `createGroupPathColumn({...})` 같은 헬퍼가 컬럼을 생성하면 펼쳐서 추적

## 검증

```bash
# 적용 현황
python -c "
import json
with open('docs/swagger-after.json') as f:
    spec = json.load(f)
count = sum(1 for p in spec.get('paths',{}).values() 
    for op in p.values() if isinstance(op, dict) and 'x-filterable-fields' in op)
print(f'적용: {count}개 엔드포인트')
"

# 기대: ~90개 (FiltersPageableDto 사용 전체)
```

## AI 정확도 재테스트 시나리오

PDF 요청서의 대표 질의:
```
사용자: "운영 환경 서버 중 CPU 80% 이상"

Before (x-filterable-fields 없음):
  { "gridFilters": [], "tagFilters": [] }  ← 포기 (48.6%)

After:
  {
    "gridFilters": [
      { "field": "cpuUtil", "operator": "greaterthan", "values": [80] }
    ],
    "tagFilters": ["confType = server", "환경 = 운영"]
  }
```

## Success Criteria

- [ ] lucida-ui gridColumnDefs 파싱 완료 → `endpoint_field_mapping.json` 생성
- [ ] lucida-meta i18n 매핑 완료 → 한국어 라벨 병합
- [ ] filterType → operators 자동 변환
- [ ] ~90개 엔드포인트에 `x-filterable-fields` 적용
- [ ] GridFilter 정확도 29% → 80%+ 확인

## 연관 스킬

- `swagger-ai-optimization` — 전체 13단계 워크플로우 (이 스킬은 Phase 9~13 상세화)
- `parallel-bulk-annotation` — 대량 어노테이션 병렬 처리 (x-filterable-fields를 코드로 추가할 때)

## Pitfalls

- **tt() 키가 messages_ko_kr.properties에 없음**: 영문만 있거나 누락된 경우 → 원본 key를 fallback으로 사용하거나 수동 보완
- **filterType 헬퍼 함수**: `columnGridFilter(isServer, 'Text')` 같은 래퍼의 인자에서 파싱
- **컴포넌트 ↔ endpoint 간접 연결**: 컬럼 정의와 API 호출이 다른 파일 → props/import 추적 필요
- **tagFilter 허용값은 자동화 불가**: 시스템 설정 의존 (예: "환경: 운영/개발/테스트")이라 수동 또는 런타임 추출 필요

## 참조 문서

- OpenAPI 스펙 개선 요청 PDF (x-filterable-fields 포맷 명세)
- `menu_api_mapping.json` — 메뉴↔API 카테고리 매핑
- `menu_api_field.json` — 기존 수동 매핑 (default_filter, domain)
- `GUIDE_SWAGGER_AI_OPTIMIZATION.md` Phase 9~13
