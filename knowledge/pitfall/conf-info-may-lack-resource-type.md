---
name: conf-info-may-lack-resource-type
version: 0.1.0-draft
tags: [pitfall, conf, info, may, lack, resource]
category: pitfall
summary: The `conf_info` collection is NOT guaranteed to carry `resourceType` for every metric; criteria builders must tolerate missing field
source:
  kind: project
  ref: lucida-performance@0536094
confidence: medium
---

# `conf_info` does not always have `resourceType`

## Fact

When building search criteria, `MeasurementMetricRepositoryImpl` guards `resourceName` addition with `!resourceType.contains("CustomSQL")` and similar checks, because `conf_info` documents for custom-SQL and some imported metric definitions omit `resourceType`.

## Why

An earlier "fix" added `resourceType` filtering into the `conf_info` query to cut index scans, which silently dropped metrics whose definitions were authored without a resourceType (custom-SQL, some KCM imports). The regression manifested as "missing metrics" rather than errors — very easy to miss in code review.

## How to apply

- Do not blindly `criteria.and("resourceType").is(x)` when querying `conf_info`. If the caller's intent is "filter by resourceType if known", encode it as an `$or` with `{resourceType: {$exists: false}}` — or skip the clause entirely when resourceType is missing upstream.
- When a user reports "my custom-SQL metric disappeared", check first whether a recent change introduced an unconditional resourceType filter on `conf_info`.
- The `definition.category` field is a safer filter than `resourceType` for the same intent (narrowing by metric family).

## Evidence

- `dao/MeasurementMetricRepositoryImpl.java` CustomSQL guards around `resourceName`.
- Commits `a5e4cd5` "ResourceType 검색 조건으로 conf_info 조회하는것 제외(conf_info에 resourceType이 없는 지표도 있음)" and `ab9cfdf` "conf_info에서는 적용안되게" directly state this invariant.
