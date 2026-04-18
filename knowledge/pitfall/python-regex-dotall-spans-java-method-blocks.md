---
version: 0.1.0-draft
name: python-regex-dotall-spans-java-method-blocks
description: Python re.sub에서 DOTALL + .*? 로 Java 메서드를 batch 편집하면 non-greedy여도 인접 메서드 블록을 건너뛰어 잘못된 위치에 annotation이 삽입된다
category: pitfall
tags:
  - python
  - regex
  - java
  - annotation-batch
  - swagger-ai-optimization
---

# python-regex-dotall-spans-java-method-blocks

`@Operation` / `@PostMapping` 에 `@Extension` 을 대량으로 붙이려고 Python 정규식을 돌렸는데, 의도한 엔드포인트가 아닌 **바로 윗/아래 엔드포인트**에 확장이 붙는다. re.subn 호출 결과의 교체 건수는 맞게 나오고 빌드도 성공하지만, 랜딩 위치가 어긋나 **엔드포인트·param 매핑이 뒤집힌 오염 데이터**가 된다. 증상이 미묘해서 스펙 JSON을 열어 cross-check 하기 전까지는 발견하기 어렵다. 실전 사례: `ConfigurationController`에서 `/conf-info/{confId}/resource-info` 에 `x-resolver(param=confId)` 를 붙이려 했는데, 바로 뒤에 있는 `/os-types` 엔드포인트 앞에 삽입됐다. 빌드는 green, x-resolver count는 +1 증가, 그러나 landing은 틀린 endpoint.

원인은 `re.DOTALL` 과 `.*?` 조합이다. 아래 같은 패턴에서:

```python
pat = re.compile(
    r'security = \{@SecurityRequirement\(name = "bearerAuth"\)\}\)\n(\s*)'
    r'@PostMapping\((".*?\{' + path_var + r'\}.*?")\)',
    re.DOTALL,
)
```

`(".*?\{confId\}.*?")` 는 non-greedy 지만 `re.DOTALL` 때문에 `.` 이 개행도 매치한다. 엔진의 동작은 (1) "가장 왼쪽에서 시작하는 첫 매치"를 찾고 (2) 주어진 제약을 만족할 때까지 non-greedy로 확장한다. 여러 엔드포인트가 연속으로 `security = ...) / @PostMapping(...)` 쌍을 이루는 경우, 앞쪽 엔드포인트의 security 닫는 괄호에서 시작해서 뒤쪽 엔드포인트의 `@PostMapping("/conf-info/{confId}/...")` 까지 **중간 엔드포인트를 통째로 뛰어넘어** 단일 매치로 포획한다. 결과적으로 교체 문자열이 앞쪽 엔드포인트의 @Operation 뒤에 붙어버린다. 간단히 말해 **"security 닫는 괄호"와 "path-param 포함 PostMapping" 사이 거리가 멀면 `.*?` 가 블록 경계를 무시하고 점프한다.**

대응은 세 가지다. 첫째, **path 문자열 전체를 리터럴로 고정**. `re.escape(path)` 로 path의 모든 부분을 포함시키고 `.*?` 는 제거한다:

```python
path = '/conf-info/{confId}/resource-info'
escaped = re.escape(path)
pat = re.compile(
    r'security = \{@SecurityRequirement\(name = "bearerAuth"\)\}\)\n(\s*)'
    r'@PostMapping\((path = )?"' + escaped + r'"\)',
    re.DOTALL,
)
```

둘째, **각 endpoint를 개별 패턴으로 한 번씩 호출** — 한 번의 re.sub로 모든 endpoint를 잡지 말고 endpoint 수만큼 루프 돌리기. 셋째, **DOTALL 끄기** — `.` 가 개행을 매치하지 않게 해서 single-line 범위 내에서만 매치. 단, `@PostMapping(path = "...")` 이 여러 줄로 쪼개진 포매팅에서는 실패하므로 주의.

검증은 반드시 사후 감사로. 빌드 성공만으로는 랜딩 오염을 잡을 수 없다. spec 재추출 후 `x-resolver.param` 이 실제 path의 path-param 중 하나인지 교차 검증하는 스크립트를 돌린다:

```python
import json, re
s = json.load(open('docs/swagger-after.json', encoding='utf-8'))
for p, ms in s['paths'].items():
    path_params = re.findall(r'\{([^}]+)\}', p)
    for m, op in ms.items():
        xr = op.get('x-resolver')
        if xr and xr.get('param') and xr['param'] not in path_params:
            print(f'DRIFT: [{m}] {p} x-resolver.param={xr["param"]} vs path_params={path_params}')
```

한 줄 교훈: **DOTALL + `.*?` 는 "가장 짧은 매치"를 보장하지만 "가장 가까운 블록 내" 매치를 보장하지는 않는다.** Batch 편집은 path/operationId 같은 **unique anchor** 를 반드시 패턴에 포함시킬 것.
