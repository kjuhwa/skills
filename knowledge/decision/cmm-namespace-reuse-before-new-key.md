---
version: 1.0.0
name: cmm-namespace-reuse-before-new-key
description: lucida-ui i18n 신규 키를 만들기 전에 `cmm.*` 공용 네임스페이스의 기존 키를 grep 으로 먼저 재사용한다
category: decision
tags:
  - i18n
  - lucida-ui
  - tt
  - cmm-namespace
  - key-reuse
source_project: lucida-ui
---

# cmm-namespace-reuse-before-new-key

## 배경
lucida-ui 의 `tt()` 는 런타임에 백엔드 i18n 서비스에서 메시지 맵을 로드한다 (`shared/i18n/translation.ts`, FE 레포의 `json/*` 은 스켈레톤). 신규 키를 만들면 백엔드 i18n 시스템에 별도 등록해야 하므로 배포 전 반드시 핸드오프 단계가 생긴다. 키 라이프사이클 비용 감축을 위해 기존 공용 키 재사용 원칙이 필요하다.

## 결정
1. 신규 문구가 필요할 때 먼저 grep:
   ```bash
   grep -rn "tt('cmm\\.<후보>')" shared host remotes --include="*.ts" --include="*.tsx"
   ```
2. 매칭되면 그 키 그대로 재사용한다.
3. 합성 가능한 경우 `cmm.0_select` + `cmm.column` 처럼 템플릿 키 조합으로 해결:
   ```tsx
   tooltip={tt('cmm.0_select', [tt('cmm.column')])}  // "컬럼 선택"
   ```
4. 그래도 없을 때만 `cmm.<snake_case_short>` 로 짧게 신규 키를 만들고 BE i18n 시스템 등록 요청서를 남긴다.

## 기존 재사용 목록 (검증됨)
- 동작: `cmm.save` · `cmm.cancel` · `cmm.close` · `cmm.search` · `cmm.reset` · `cmm.confirm` · `cmm.apply`
- 라벨: `cmm.required_field` · `cmm.config_info` · `cmm.column` · `cmm.alarm` · `cmm.occurrence` · `cmm.duration`
- 템플릿: `cmm.0_select` (= "{0} 선택")
- 에러: `cmm.error_1` · `cmm.delete_history` · `cmm.delete_something` · `cmm.max_e`

## 함정
- FE 레포의 `shared/i18n/json/*.json` 은 스켈레톤 — 여기에 넣어도 의미 없음.
- 미등록 키는 `tt()` 폴백으로 key 문자열 raw 노출 → UX 깨지나 기능은 동작.
- 배포 직전 "i18n 등록 요청서" 를 BE/운영에 핸드오프하는 단계가 필수.

## 사이드 정책
FE 코드에 `LABEL_FALLBACK: Record<key, ko>` 테이블을 두고 i18n 미등록 상태에서도 최소한 한국어를 보여주는 graceful degradation 을 허용.
