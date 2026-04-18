---
version: 0.1.0-draft
name: god-controller-split-by-resource
category: decision
summary: "Split an oversized controller along URL sub-resource boundaries (one controller per sub-path like /page, /widget, /file) and keep the common @RequestMapping prefix — clearer per-class responsibility without breaking the external API surface."
scope: global
source:
  kind: project
  ref: lucida-widget@1055c23
confidence: medium
tags: [refactor, controller, srp, spring]
---

# Split God Controller by Resource Sub-Path, Keep Shared Prefix

## Fact
Rather than extracting per-method services, split an oversized controller (`WidgetController`: 1903 lines, 25+ endpoints) into multiple controllers along **resource boundaries**, keeping the common `@RequestMapping` prefix so the external API surface is unchanged. Result: 1903 → 980 lines, responsibility per class clearer.

## Why
- Pure service extraction leaves the controller still bloated with request/response plumbing.
- Routing is already keyed on URL sub-paths (`/page`, `/page/{id}/widget`) — those are natural seams.
- Keeping `@RequestMapping("/api/widget")` across the new classes means no client or API-doc breakage.

## How to apply
1. Group endpoints by their URL sub-resource (dashboard / page / widget / file).
2. Create `WidgetPageController`, `WidgetItemController` etc., each with its own `@RequestMapping("/api/widget")` (Spring allows duplicate prefixes across controllers).
3. Move endpoints + their private helpers; keep BaseController inheritance.
4. Fix any internal call sites that delegated to the old controller (dev/test harness controllers).

## Counter / Caveats
- Only split when sub-resources are truly independent; if they share heavy state/validation, extract a service instead.
- Keep Swagger tags/sections adjusted so the grouped view in the UI still makes sense.

## Evidence
- Commit `1055c23` — "God Class 분리 (WidgetController, WidgetDto)".
- WidgetController 10 methods moved out; `WidgetDto` factory methods moved to `WidgetDtoFactory` (935 → 390 lines).
