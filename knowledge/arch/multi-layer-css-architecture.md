---
version: 0.1.0-draft
tags: [arch, multi, layer, css, architecture]
name: multi-layer-css-architecture
category: arch
summary: Four-layer CSS architecture — SCSS (sirius design system), LESS (Ant Design vars), Tailwind v4 (AI Portal with scope isolation), plain CSS — each with distinct webpack rules and toolchains
source:
  kind: project
  ref: lucida-ui@4b922a90
evidence:
  - webpack.base.js — four separate CSS loader rule blocks (CSS for AI Portal, CSS general, SCSS, LESS)
  - 537 SCSS files, 464 CSS files, 71 LESS files
  - postcss-prefix-selector isolates Tailwind from other layers
---

# Multi-Layer CSS Architecture

## Fact

lucida-ui uses four CSS processing layers, each with its own webpack rule:

| Layer | Extension | Toolchain | Scope | Purpose |
|-------|-----------|-----------|-------|---------|
| **Tailwind CSS** | `.css` (AI Portal path) | postcss-loader → @tailwindcss/postcss → postcss-prefix-selector → css-loader → style-loader (lazyStyleTag) | `:where(.nds-root)` scoped | AI Portal module components |
| **General CSS** | `.css` (everything else) | postcss-loader → css-loader → style-loader / MiniCssExtractPlugin | Global | Third-party CSS, simple overrides |
| **SCSS** | `.scss` | sass-loader → postcss-loader → css-loader → style-loader / MiniCssExtractPlugin | Global (with `$iconfont-ts` injection) | Sirius design system, Ant Design overrides, all custom component styles |
| **LESS** | `.less` | less-loader (modifyVars) → css-loader → style-loader | Global | Ant Design theme customization only |

## Why

This layered architecture evolved from:
1. Original Ant Design + SCSS project (LESS for Ant Design, SCSS for custom)
2. Added AI Portal module with Tailwind CSS v4
3. Needed scope isolation to prevent Tailwind preflight from breaking existing Ant Design/SCSS styles

The `include`/`exclude` split in webpack rules ensures CSS files are processed by exactly one pipeline.

## How to apply

- **New AI Portal components** → Tailwind utilities + design tokens via CSS custom properties
- **New standard components** → SCSS in sirius design system with figma-token SCSS variables
- **Ant Design overrides** → SCSS files in `packages/sirius/src/styles/components/antd-new/`
- **Never** add Tailwind classes outside the AI Portal scope boundary
- Production: SCSS/general CSS → MiniCssExtractPlugin (separate file); Tailwind CSS → lazyStyleTag (injected on-demand)
