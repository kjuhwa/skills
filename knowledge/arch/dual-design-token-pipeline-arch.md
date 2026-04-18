---
version: 0.1.0-draft
tags: [arch, dual, design, token, pipeline]
name: dual-design-token-pipeline-arch
category: arch
summary: Project runs two parallel design token pipelines — legacy SD v3→SCSS for sirius/Ant Design and modern SD v5→CSS @theme for AI Portal/Tailwind v4
source:
  kind: project
  ref: lucida-ui@4b922a90
evidence:
  - packages/figma-token/build.js — Style Dictionary v3, outputs SCSS to packages/sirius/src/styles/tokens/
  - scripts/build-tokens.mjs — Style Dictionary v5, outputs CSS @theme to shared/components/commons/ai-portal/styles/tokens.css
  - Both pipelines read from Figma Tokens Studio DTCG exports but from different token sets
---

# Dual Design Token Pipeline Architecture

## Fact

lucida-ui maintains **two independent** design token build pipelines:

| Pipeline | Tool | Input | Output | Consumer |
|----------|------|-------|--------|----------|
| Legacy | Style Dictionary v3 + `@tokens-studio/sd-transforms` ^0.5.7 | `packages/figma-token/tokens.json` → split JSON files | SCSS variables, typography classes, composition classes | `packages/sirius` (Ant Design override layer) |
| Modern | Style Dictionary v5 + `@tokens-studio/sd-transforms` latest | `shared/components/commons/ai-portal/tokens/` (DTCG multi-file) | CSS custom properties in `@theme {}` with dark/contrast overrides | AI Portal module (Tailwind CSS v4) |

## Why

The project is incrementally migrating from an Ant Design + SCSS theming system to Tailwind CSS v4 with CSS custom properties. The AI Portal module was the first to adopt the modern pipeline. The legacy pipeline cannot be removed until all sirius consumers migrate.

Key commits:
- `7425b353f9` — Style Dictionary v5 migration for token build pipeline
- `be46ee4dcc` — Primitives design token migration and new components
- `3f30312990` — DTCG multi-file token conversion pipeline reimplementation

## How to apply

- When adding tokens for sirius/Ant Design components → use the legacy pipeline (`packages/figma-token/`)
- When adding tokens for AI Portal components → use the modern pipeline (`shared/components/commons/ai-portal/tokens/`)
- Do NOT mix: each pipeline has its own token set, naming conventions, and output format
- The modern pipeline includes breaking change detection; the legacy one does not
