---
title: 원격 repo 작업은 mktemp + shallow clone + 정리 패턴을 쓴다
category: arch
summary: "publish/install/원격 목록 조회처럼 원격 git repo를 만질 때는 `mktemp -d → git clone --depth 1 → 작업 → rm -rf`. 작업 디렉토리를 오염시키지 않는다."
source:
  kind: project
  ref: nkia-skills@41c2032
confidence: medium
---

## Fact
`skill-publish`, `skill-install`, `skill-list --remote` 세 스킬 모두 동일한 임시 디렉토리 패턴을 사용합니다:

```bash
tmp_dir=$(mktemp -d)
git clone --depth 1 --branch {branch} {remote_url} "$tmp_dir"
# ... 작업 ...
rm -rf "$tmp_dir"
```

- `--depth 1`로 대용량 히스토리 다운로드 회피.
- 사용자 작업 디렉토리를 건드리지 않음.
- 실패 경로에서도 반드시 정리(trap 권장).

## Evidence
- `skills/skill-publish/SKILL.md` Step 4·Step 8.
- `skills/skill-install/SKILL.md` Step 3·Step 6.
- `skills/skill-list/SKILL.md` Step 3 (원격 모드).

## How to apply
- 원격 git repo에 대한 어떤 조회/쓰기든 현재 작업 디렉토리를 경유하지 말 것.
- 중단/에러 시에도 임시 디렉토리가 남지 않도록 `trap 'rm -rf "$tmp_dir"' EXIT` 권장.
