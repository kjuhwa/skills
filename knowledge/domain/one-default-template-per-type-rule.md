---
version: 0.1.0-draft
tags: [domain, one, default, template, per, type]
name: one-default-template-per-type-rule
category: domain
summary: Exactly one default message template may exist per notification type; creating a second default is rejected, but editing the existing default is allowed
source:
  kind: project
  ref: lucida-notification@release-10.2.4_2
  evidence:
    - "commit ede0b41 — '기본 템플릿은 하나만 생성할 수 있도록 수정'"
    - "commit 72d9a2d — '디폴트 템플릿은 수정 할 수 있도록 코드 수정'"
    - "commit 18dee67 — '템플릿 수정 시 기본 템플릿이 이미 있으면 수정이 안되도록 변경' (reversed by 72d9a2d)"
confidence: high
---

## Fact
Business rule: per `(notificationType, locale)` pair, at most one template has `isDefault = true`. Creating a second default must fail validation. Editing the *content* of the existing default must be allowed — but toggling a non-default template to default when another already holds that flag must fail.

The rule flipped mid-development: first "default is immutable", then "default is editable but unique". The current state is *editable but unique*.

## How to apply
- On template create: if `isDefault=true` in request, check no other default exists for `(type, locale)`.
- On template update: allow body/subject edits on the default freely; reject attempts to *promote* a new template to default while another default exists — require explicit demote first.
- When seeding defaults at server start (commit `ec5b2a4` adds report default), use upsert-by-type, not insert.

## Counter / Caveats
- Treat the "immutable default" commit (`18dee67`) as historical context only — the current rule is the opposite.
- Locale was added later (commit `9fad817` — template locale change); templates predating that may have null locale and need a one-time migration.
