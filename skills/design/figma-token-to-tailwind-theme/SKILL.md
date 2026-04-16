---
name: figma-token-to-tailwind-theme
description: Pipeline from Figma Token Studio JSON exports through Style Dictionary v5 to Tailwind v4 @theme CSS custom properties, with dark/light mode support
category: design
trigger: When setting up a design token pipeline from Figma to code, or migrating to Tailwind v4 @theme format
version: 1.0.0
source_project: lucida-ui
---

# Figma Token → Tailwind @theme Pipeline

## Context
Design tokens authored in Figma Token Studio need to flow into code as CSS custom properties consumable by Tailwind v4's `@theme` directive, supporting dark/light mode switching via `[data-theme]` selectors.

## Steps

1. **Export tokens from Figma Token Studio** as JSON per category:
   - `tokens/core/*.json` — primitive values (colors, spacing, sizing, typography)
   - `tokens/theme/light-mode.json`, `dark-mode.json` — semantic aliases per mode

2. **Configure Style Dictionary v5** build script:
   - Input: token JSON files
   - Transform group: `css` (or custom transforms for kebab-case, px→rem)
   - Output format: CSS custom properties under `@theme` block
   - Dark mode: generate `[data-theme="dark"]` overrides only for differing vars

3. **Build command**: `yarn run build:tokens` → `scripts/build-tokens.mjs`
   - Reads token JSON → resolves aliases → outputs `tokens.css`
   - Token categories: background, layer, field, border, text, link, icon, feedback, interactive (46+ categories)

4. **Consume in Tailwind v4**:
   - Import generated `tokens.css` in your `@theme` layer
   - Variables become available as `bg-[--color-background-primary]` or via Tailwind config mapping

5. **Theme switching**:
   - Store theme preference: `localStorage` key + Recoil atom / context
   - Apply `data-theme="dark"` attribute on root element
   - CSS cascade handles the rest — dark vars override light vars

## Key decisions
- Light mode defines all base vars; dark mode only overrides differing vars (smaller bundle)
- Token naming: `--{category}-{variant}-{state}` (e.g., `--color-text-primary-hover`)
- Legacy theme constants (`THEME_LIGHT`, `THEME_DARK`) coexist for non-Tailwind consumers
