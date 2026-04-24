---
doc: technique-schema-draft
status: draft-v0.1
author: kjuhwa@nkia.co.kr
date: 2026-04-24
---

# `technique/` — 스킬 허브 중간 계층 설계 초안

## 1. 왜 필요한가

현재 허브는 **원자 단위(skill, knowledge)** 와 **완성 산출물(example)** 두 극단만 존재한다. 실전에서는 보통 2~N개 스킬·지식을 특정 순서·조건으로 조합해야 하나의 결과가 나온다. 이 조합 자체를 재사용 가능한 단위로 고정할 수 있는 저장소가 없어, 사용자는 매번 스킬·지식을 수동으로 골라 맞춰야 한다.

`technique/`는 이 **중간 레이어**를 담당한다:

```
knowledge  ─┐
skill      ─┼──►  technique  ──►  example (instance)
research   ─┘
```

- technique은 skill/knowledge를 **재배치하지 않고 참조만** 한다 (중복 저장 금지).
- 부족분은 `hub-research`로 외부 자료를 당겨 technique 본문에 녹인다.
- example은 technique을 실행해 만든 **1회성 결과물**이며, technique은 **재현 가능한 레시피**다.

## 2. 기존 개념과의 경계

| 개념 | 위치 | 단위 | 재사용성 | 구성 |
|---|---|---|---|---|
| skill | `skills/{cat}/{slug}/SKILL.md` | 원자 절차 | 높음 | 단일 |
| knowledge | `knowledge/{cat}/{slug}.md` | 원자 사실/교훈 | 높음 | 단일 |
| **technique** | `technique/{cat}/{slug}/TECHNIQUE.md` | **조합 레시피** | **높음** | **복수 참조** |
| example | `example/{cat}/{slug}/` | 완성 산출물 | 낮음 (데모) | 산출물만 |
| hub-merge | 커맨드 | 병합 (복사·흡수) | — | 1회성 |

`hub-merge`와의 차이: merge는 원본 스킬을 **흡수·소멸**시키지만, technique은 원본을 **살려둔 채 참조**한다. 원자 단위의 독립성이 유지되므로 다른 technique에서 재사용할 수 있다.

## 3. 디렉토리 & 파일 레이아웃

```
technique/
  <category>/
    <slug>/
      TECHNIQUE.md         ← 메타 + 본문 (필수)
      verify.sh            ← 합성 검증 스크립트 (선택)
      resources/           ← 보조 자산 (선택, 이미지·샘플 등)
```

카테고리는 `CATEGORIES.md`의 기존 목록을 재사용. technique 전용 신규 카테고리는 만들지 않는다 (tag로 해결).

## 4. Frontmatter 스키마

```yaml
---
version: 0.1.0                  # semver, draft-0 허용
name: <slug>                    # 디렉토리명과 동일
description: <한 줄, ≤120자>    # 언제 써야 하는지 1문장
category: <CATEGORIES.md 값>
tags: [<string>, ...]

composes:                       # 핵심: 어떤 원자 단위를 묶는가
  - kind: skill                 # skill | knowledge
    ref: workflow/autoplan      # kind 루트 기준 실제 디스크 경로 (폴더 슬러그)
                                # ※ frontmatter category와 불일치할 수 있으므로
                                #   '실제 경로'를 쓴다 (파일럿에서 발견)
    version: "^1.0.0"           # semver range (loose) 또는 정확값 (pinned)
    role: orchestrator          # 이 조합 내 역할 (자유 문자열)
  - kind: knowledge
    ref: workflow/batch-pr-conflict-recovery
    version: "*"                # 최신 허용
    role: failure-mode

requires_research:              # 외부 보강 필요 시 (선택)
  - topic: "GitHub GraphQL rate limit"
    rationale: "hub-research로 최신 한도 확인 필요"

binding: loose                  # loose (기본) | pinned
                                #   loose: version range 만족하면 재사용
                                #   pinned: 정확히 그 커밋/버전만 유효

verify:                         # 사용 시점 건전성 체크 (선택)
  - "모든 composes.ref 가 현재 설치되어 있는가"
  - "composes[].version range 가 설치본과 교차하는가"
  - cmd: "./verify.sh"          # 커스텀 검증
---
```

## 5. 바인딩 모드 (핵심 트레이드오프)

| 모드 | 동작 | 장점 | 단점 |
|---|---|---|---|
| `loose` (기본) | semver range로 참조, 사용 시점에 설치본 재검증 | 하위 스킬 업데이트를 자동 흡수 | 하위 breaking 시 technique 재검증 필요 |
| `pinned` | 특정 버전(또는 commit SHA)에 고정 | 재현성 100% | 하위 스킬 오래되면 유지비 증가 |

**권장**: 초기 모든 technique은 `loose`로 시작. 프로덕션/감사 경로에만 `pinned`. `hub-precheck`이 `pinned` technique의 참조 버전이 허브에서 사라졌을 때 경고.

## 6. 라이프사이클

```
draft (.technique-draft/)   ──►  publish (technique/)   ──►  outdated (자동 플래그)
     ▲                                                              │
     └─── hub-refactor, hub-split ────────────────────────────────┘
```

- `.technique-draft/`: `.skills-draft/`·`.knowledge-draft/`와 동일한 로컬 준비 영역.
- publish 시 `technique/{cat}/{slug}/` 로 이동.
- **outdated 판정**: 참조하는 skill/knowledge의 major 버전이 올라가면 `index.json`에 `outdated: true` 마킹. `hub-precheck`이 리포트.

## 7. Registry 통합

`~/.claude/skills-hub/registry.json` 확장:

```json
{
  "version": 3,                 // 2 → 3 (스키마 bump)
  "skills": { ... },
  "knowledge": { ... },
  "techniques": {               // 신규 섹션
    "<cat>/<slug>": {
      "category": "workflow",
      "scope": "global",
      "path": "~/.claude/techniques/<cat>/<slug>/",
      "installed_at": "2026-04-24",
      "version": "0.1.0",
      "source_commit": "<sha>",
      "pinned": false,
      "composes_snapshot": [    // 설치 시점의 실제 해석 결과
        {"kind":"skill","ref":"workflow/autoplan","resolved_version":"1.2.3"},
        {"kind":"knowledge","ref":"workflow/batch-pr-conflict-recovery","resolved_version":"0.1.0"}
      ]
    }
  }
}
```

`composes_snapshot`이 있어야 설치 이후 `loose` 모드에서도 "무엇이 깨졌는지" 사후 추적 가능.

## 8. index.json 통합

master / lite / category 인덱스에 `technique` 섹션 추가. 검색(`hub-find`)은 skill·knowledge·technique을 **동등하게** 매칭하되 결과 행에 `kind: technique` 배지를 붙여 구분.

## 9. 검증 규칙 (publish 및 precheck)

1. `composes[]` 의 모든 `ref`가 허브에 **실제 파일로** 존재 (frontmatter category와 무관, 디스크 경로로 확인).
2. 각 `version` range가 허브의 해당 항목 semver와 **공집합 아님**.
3. 순환 참조 금지: technique은 다른 technique을 참조하지 **않는다** (v0에서는 flat 1-depth만 허용. 중첩은 v0.2 이후 검토).
4. `description` 필수 + ≤120자.
5. `name`과 폴더명 일치.
6. `verify.sh`가 있으면 exit code 0.
7. `ref`는 kind 루트 기준 실제 경로 (예: `parallel-build-sequential-publish` 또는 `workflow/autoplan`).

## 10. 슬래시 커맨드 (3단계에서 구현, 지금은 목록만)

- `/hub-technique-compose <slug>` — 드래프트 작성 워크플로 (skill/knowledge 선택 → frontmatter 생성)
- `/hub-technique-list` — 설치된 technique 목록
- `/hub-technique-show <slug>` — 본문 + 구성 해설
- `/hub-technique-install <ref>` — 리모트에서 설치
- `/hub-technique-verify <slug>` — composes 상태 점검
- 기존 `/hub-find`, `/hub-status`, `/hub-precheck`는 technique 섹션만 추가로 읽도록 **확장**

## 11. 오픈 이슈

- **Q1.** technique이 technique을 참조 허용할 것인가? → v0 금지. 과도한 결합과 순환 위험. v0.2에서 재검토.
- **Q2.** `loose` 모드에서 lockfile 두는가? → `composes_snapshot`으로 충분하다는 판단. 별도 lockfile 없음.
- **Q3.** example ↔ technique 연결? → example frontmatter에 `produced_by_technique: <ref>` 선택 필드 추가 제안 (본 초안 범위 밖, 별도 PR).
- **Q4.** 카테고리 추가? → 불필요. 기존 카테고리 + tag로 수용.
- **Q5.** (파일럿 2에서 발견) `composes[]`는 현재 **순서 없는 집합**. 선형 파이프라인은 `role`에 "phase-0-anchor" 같은 문자열로 우회 가능, 분기 결정트리는 본문 산문으로만 표현됨. v0에서는 수용 (role 자유문자열이 충분히 흡수). v0.2에서 정형 phase/branch DSL 도입 여부 재검토.

## 12. 파일럿 후보 (2단계 입력)

이 초안이 승인되면 다음 조합 중 하나로 첫 technique을 시작 제안:

- `workflow/autoplan` + `workflow/batch-pr-conflict-recovery` → **"대량 PR 자동 생성 안전 패턴"**
- 기타: 현재 설치된 `swagger-ai-optimization` 단독 → technique화 여부 자체가 테스트 케이스 (단일 스킬은 technique이 아님을 확인)

---

**다음 단계.** 이 초안에서 다음 3가지만 먼저 확정:
1. 바인딩 기본값 (`loose` 제안)
2. 중첩 금지 여부 (v0에서 금지 제안)
3. 파일럿 후보 선택

확정되면 2단계(파일럿 technique 1건 작성)로 진행.
