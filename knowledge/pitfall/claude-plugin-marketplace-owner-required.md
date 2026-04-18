---
name: claude-plugin-marketplace-owner-required
version: 0.1.0-draft
tags: [pitfall, claude, plugin, marketplace, owner, required]
title: Claude Code marketplace.json은 `owner` 필드가 필수
category: pitfall
summary: "플러그인 설치 스키마 오류: marketplace.json 최상위에 `owner` 객체 없으면 플러그인 설치가 실패."
source:
  kind: project
  ref: nkia-skills@41c2032
confidence: high
---

## Fact
Claude Code `extraKnownMarketplaces`로 플러그인을 배포할 때, `.claude-plugin/marketplace.json` 최상위에 `owner: { name: "..." }` 객체가 없으면 설치 스키마 검증이 실패합니다.

## Evidence
- 커밋 `4c32f47` — "marketplace.json에 owner 필드 추가 — 플러그인 설치 스키마 오류 해결"
- 현재 `.claude-plugin/marketplace.json`은 `"owner": { "name": "nkia" }` 유지 중.

## How to apply
신규 플러그인 repo를 만들거나 marketplace.json을 편집할 때 `owner.name` 누락 여부를 먼저 확인. 스키마: `https://anthropic.com/claude-code/marketplace.schema.json`.
