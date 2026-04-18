---
version: 0.1.0-draft
name: k-git-tag-registry-versioning
type: knowledge
category: arch
tags: [git, versioning, registry, rollback, semver]
summary: "Git tag를 semver registry로 쓰면 별도 version manifest 없이 rollback·pinning을 얻는다"
source:
  kind: commit
  ref: cff6174d1193992e9eb10196ff266122493779aa
  repo: https://github.com/kjuhwa/skills.git
confidence: high
linked_skills: [git-tag-registry-versioning]
supersedes: null
extracted_at: 2026-04-15
extracted_by: skills_extract_knowledge v1
---

## Fact
Git-backed asset distribution에서 release line은 tag, rollback은 `checkout <tag>`, pin은 "resolve-once-and-store" 패턴으로 충분하다. 별도의 version index/manifest를 유지할 필요가 없다.

## Context / Why
- Registry 서비스 없이 git만으로 asset(skill, plugin, command 등)을 배포할 때, 버전 관리 계층을 추가하면 두 번째 진실 공급원(registry vs git)이 생겨 drift가 발생한다.
- Tag는 git 자체가 불변·서명 가능·원자적으로 다뤄 주므로 semver 버전 식별자로 재사용하면 추가 인프라가 0이다.
- 각 로컬 설치본에는 "설치 시점의 tag(=commit)"만 기록하면 재현성과 rollback이 성립한다.

## Evidence
- [commit cff6174] skills/arch/git-tag-registry-versioning/content.md:1-99
- [commit 2849a01] bootstrap/commands/skills_publish.md — `/skills_publish` 가 `skills/<name>/v<semver>` tag를 생성
- [commit 2849a01] bootstrap/commands/skills_sync.md — `--skill/--version` 으로 rollback, `--unpin` 으로 pin 해제
- registry.json 에 `pinned`, `synced_at` 필드 추가

## Applies when
- 중앙 registry 없이 git 저장소만으로 asset을 배포·설치하는 툴을 설계할 때
- rollback, 버전 고정(pinning), 재현 가능 설치가 요구될 때
- 설치본이 여러 머신에 분산되어 drift를 피해야 할 때

## Counter / Caveats
- Tag 이름 충돌이나 force-push로 tag가 이동하면 재현성이 깨진다 → tag immutability 정책이 필요.
- 대규모(수천 개) asset 에서 tag 네임스페이스가 비대해지면 `git ls-remote` 성능 이슈 발생 가능 → prefix 규칙 필수.
- Binary asset이나 LFS 기반 배포에서는 tag-only 접근이 네트워크 비용과 맞지 않을 수 있음.
