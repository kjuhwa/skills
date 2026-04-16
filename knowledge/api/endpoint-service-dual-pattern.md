---
name: endpoint-service-dual-pattern
description: Two coexisting API service patterns — factory functions (apmServices) and direct functional exports (alarmService) — with centralized endpoint constants
category: api
source:
  kind: project
  ref: lucida-ui@4b922a9043
---

# Endpoint + Service Dual Pattern

## Fact

The API layer has two coexisting service patterns, both consuming centralized endpoint constants from `shared/apis/endpoint/`. Neither pattern is deprecated — new services use either based on developer preference.

## Pattern A: Factory Service (Older, Larger Domains)

```typescript
// shared/apis/nkia/apm/apmServices.ts (620+ lines, 100+ methods)
export default (axiosInstance: AxiosInstance) => ({
  getServiceLists(payload: ServiceListParams) {
    return response(axiosInstance.post(APM_EP.SERVICE_LIST, payload))
  },
  getServiceDetail(payload: GetServiceListInput) {
    return response(axiosInstance.get(APM_EP.SERVICE_DETAIL(payload.serviceId)))
  },
})
```

- Returns object with methods, injected with axios instance
- Instantiated once in `apiAxiosInstance.ts`: `apmService: apmServices(axiosPublic)`
- 15+ domain services aggregated into single `IApi` interface

## Pattern B: Functional Export (Newer, Smaller Domains)

```typescript
// shared/apis/nkia/alarm/alarmService.ts (596 lines)
export const postAlarmDefinition = (params: IdvAlarmDefinition) =>
  requestPostNew<number, null>(ALARM_EP.ALARM_DEFINITION, params)

export const postAlarmSeverityModify = (params: FormData) => {
  const header = { 'Content-Type': 'multipart/form-data' }
  return requestPostNew<AlarmSeveritySetting[]>(
    ALARM_EP.ALARM_SEVERITY_MODIFY, params, undefined, undefined, header
  )
}
```

- Individual exports, no factory
- Uses `requestPostNew<T>` directly (not `response()` wrapper)
- Tree-shakeable — unused functions can be eliminated

## Endpoint Constants

```typescript
// shared/apis/endpoint/accountEndPoint.ts
import { BASE_URL } from '@lucida-ui/shared/apis/constants/url'

// Static endpoints
export const AUTH_LOGIN = `${BASE_URL}/api/account/login`

// Parameterized endpoints
export const SERVICE_DETAIL = (serviceId: string) =>
  `${BASE_URL}/services/${serviceId}`

// Barrel export
// shared/apis/endpoint/index.ts
export * as ACCOUNT_EP from './accountEndPoint'
export * as ALARM_EP from './alarmEndPoint'
export * as APM_EP from './apmEndPoint'
// ... 30+ domains
```

## Evidence

- Factory pattern: `apmServices.ts` (620 lines), `dpmServices.ts`, `performanceServices.ts`
- Functional pattern: `alarmService.ts` (596 lines), `account/user.ts`, `account/role.ts`
- Both use typed responses: `IApiResult<T>` with `{ data, status, message, success, errorCode }`
- 40+ endpoint files in `shared/apis/endpoint/`

## Why Two Patterns Coexist

1. **Organic evolution** — factory pattern came first (DI-friendly); functional exports adopted later for simplicity
2. **No migration mandate** — both work; refactoring 620-line service files carries risk with low reward
3. **Different ergonomics** — factory groups related methods; functional enables tree-shaking
