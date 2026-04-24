---
version: 0.1.0-draft
name: safe-bulk-pr-publishing
description: Build N projects in parallel then publish them as many PRs safely — with rollback anchor, race-aware PR creation, and batch conflict recovery
category: workflow
tags:
  - parallel
  - bulk
  - pull-request
  - automation
  - safety
  - pr-flow

composes:
  - kind: skill
    ref: parallel-build-sequential-publish       # NOTE: 카테고리 폴더 밖에 있음 (허브 불일치)
    version: "^1.0.0"
    role: orchestrator
  - kind: skill
    ref: workflow/rollback-anchor-tag-before-destructive-op
    version: "*"
    role: pre-flight-safety
  - kind: knowledge
    ref: workflow/batch-pr-conflict-recovery
    version: "*"
    role: failure-recovery
  - kind: knowledge
    ref: pitfall/gh-pr-create-race-with-auto-merge
    version: "*"
    role: known-pitfall

binding: loose

verify:
  - "composes[].ref 모두 허브에 설치됨"
  - "composes[].version range 가 설치본 semver와 교차"
  - cmd: "./verify.sh"
---

# Safe Bulk PR Publishing

> 대량으로 독립 산출물을 만들고 하나씩 PR로 올리는 파이프라인. 개별 스킬·지식은 이미 존재하지만, **어느 순서·어느 지점에 엮어야 안전한지**를 고정한 레시피.

## When to use

- 한 번에 10개 이상 독립 프로젝트·예제·마이그레이션을 만들고 각자 PR로 올려야 할 때
- auto-merge가 켜진 저장소에 연속 PR을 밀어넣을 때
- 과거 비슷한 흐름에서 카탈로그/인덱스 파일 충돌로 수십 개 PR이 막힌 적이 있을 때

## When NOT to use

- 단일 PR (오버헤드만 생긴다 — 구성 스킬을 개별적으로 써라)
- PR이 서로 의존적일 때 (순서·병합 전략이 다름, 별도 technique 필요)

## Phase sequence

```
[0] Anchor      → rollback-anchor-tag-before-destructive-op
[1] Build       → parallel-build-sequential-publish (Build Phase)
[2] Publish     → parallel-build-sequential-publish (Publish Phase)
                  + gh-pr-create-race-with-auto-merge (detection in retry loop)
[3] Recover?    → batch-pr-conflict-recovery  (on catalog-file conflict storm)
```

### [0] Pre-flight anchor (필수)

`rollback-anchor-tag-before-destructive-op`를 **구성 스킬 그대로** 실행해 `backup/pre-bulk-pr-YYYYMMDD` 태그를 origin에 푸시. PR 본문에 롤백 커맨드를 미리 기록해 둔다.

**technique이 추가하는 것**: 태그 슬러그 컨벤션을 `pre-bulk-pr-<date>`로 고정 (다른 technique과 충돌 없이 식별 가능).

### [1] Build phase (병렬)

`parallel-build-sequential-publish`의 Build 절차를 따른다. 각 executor는 **git 건드리지 말 것** — 파일만 만든다.

**technique이 추가하는 것**: executor 프롬프트 말미에 다음 금지 규칙 추가:
- `example/README.md` 같은 공유 카탈로그 파일을 **수정하지 말 것** (knowledge: batch-pr-conflict-recovery §Prevention)
- 공유 파일 재생성은 Publish phase 끝에서 **한 번만** 수행

### [2] Publish phase (순차, 레이스 감지)

`parallel-build-sequential-publish`의 Publish 절차를 따르되, `gh pr create` 단계를 아래 패턴으로 감싼다:

```bash
if ! gh pr create ...; then
  # 레이스 감지 (knowledge: gh-pr-create-race-with-auto-merge)
  if git merge-base --is-ancestor "$BRANCH" origin/main; then
    echo "auto-merge already picked it up — treat as success"
  else
    echo "genuine failure"; exit 1
  fi
fi
```

**technique이 추가하는 것**: 실패와 "이미 머지됨"을 구분하는 retry/skip 로직. 구성 원자 단위는 이 분기 로직을 갖고 있지 않다.

### [3] Recovery (선택, 사고 시)

카탈로그 파일 충돌이 연쇄로 터지면 즉시 PR 발행 중단하고 `batch-pr-conflict-recovery`의 복구 절차로 전환. 조건 판정:

- 연속 3개 이상 PR이 `CONFLICTING` 상태로 나온다 → 복구 모드 스위치
- 충돌 파일이 모두 동일(`example/README.md` 등) → 조건 충족

**technique이 추가하는 것**: "언제 복구 모드로 전환할지" 판정 규칙 (원자 지식은 복구 방법만 기술, 전환 트리거는 비어 있음).

## Glue summary (technique의 순부가가치)

구성 원자가 이미 제공하는 것은 기술하지 않고, **오직 이 레시피가 더하는 것**만:

| 추가 요소 | 위치 |
|---|---|
| 태그 슬러그 컨벤션 `pre-bulk-pr-<date>` | Phase 0 |
| executor 금지 규칙 (공유 카탈로그 편집 금지) | Phase 1 |
| 레이스 vs 실패 분기 로직 | Phase 2 |
| 복구 모드 전환 트리거 규칙 (N≥3 CONFLICTING) | Phase 3 |

## Verification (draft)

`verify.sh`는 v0.1에서는 아래 셸 프라그먼트 수준으로만 제공:

```bash
#!/usr/bin/env bash
# 구성 단위가 허브 설치 상태인지 검증
set -e
SKILLS_HUB="${SKILLS_HUB:-$HOME/.claude/skills-hub/remote}"
for ref in \
  "skills/parallel-build-sequential-publish/SKILL.md" \
  "skills/workflow/rollback-anchor-tag-before-destructive-op/SKILL.md" \
  "knowledge/workflow/batch-pr-conflict-recovery.md" \
  "knowledge/pitfall/gh-pr-create-race-with-auto-merge.md"; do
  test -f "$SKILLS_HUB/$ref" || { echo "MISSING: $ref"; exit 1; }
done
echo "OK"
```

## Known limitations (v0.1 draft)

- 구성 원자 중 2개가 `0.1.0-draft` → technique도 draft 고정
- v0에서 technique 중첩 금지이므로, 이 technique을 다른 technique이 참조 불가
- `loose` 바인딩 — 구성 스킬 major 업데이트 시 재검증 필요
- **허브 불일치 발견**: `parallel-build-sequential-publish`는 frontmatter `category: workflow`지만 실제 디스크 경로는 `skills/parallel-build-sequential-publish/`(카테고리 폴더 밖). 스키마의 `ref`는 **의미(category/slug)가 아니라 kind 루트 기준 실제 경로**를 써야 함. 이 발견은 스키마 초안 §4에 반영됨

## Provenance

- Authored: 2026-04-24 (kjuhwa@nkia.co.kr)
- Status: pilot for `technique/` schema draft v0.1
- Schema doc: `technique-schema-draft.md`
