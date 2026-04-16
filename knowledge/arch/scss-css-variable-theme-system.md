---
name: scss-css-variable-theme-system
description: Architecture decision — SCSS + CSS custom properties + data-theme attribute for dark/light theming in a large React monorepo
category: arch
source:
  kind: project
  ref: lucida-ui@4b922a9043
---

# SCSS + CSS Variable Theme System

## Fact

The project uses SCSS as the primary styling approach with 100+ CSS custom properties for theming. Theme switching is implemented via a `data-theme` attribute on `<html>` toggled by a React Context + localStorage, not via CSS-in-JS runtime theming.

## Architecture

```
packages/sirius/src/styles/
├── base/_palette.scss          # 100+ CSS variables (--blue-1..10, --gray-1..10, etc.)
├── themes/
│   ├── _lightTheme.scss        # :root { --background: var(--white); ... }
│   └── _darkTheme.scss         # [data-theme="dark"] { --background: var(--gray-10); ... }
├── tokens/
│   ├── base/                   # Base design tokens
│   ├── themes/                 # Theme-specific tokens
│   └── semantic/               # Semantic tokens (--text-primary, --border, etc.)
└── components/                 # Component-specific SCSS

shared/contexts/theme/ThemeProvider.tsx
  └── React Context + localStorage('lucida-fe-theme')
  └── Sets document.documentElement.dataset.theme = 'dark' | 'light'
```

## Evidence

- `_palette.scss`: 100+ color variables defined on `:root`
- `_darkTheme.scss`: overrides via `[data-theme="dark"]` selector
- `ThemeProvider.tsx`: persists theme choice to `localStorage`, applies via `dataset.theme`
- `styled-components` used in <5 files (e.g., `DashboardOverall.tsx`) — minimal CSS-in-JS
- No Tailwind CSS (despite `@tailwindcss/postcss` in dependencies — only used for AI portal storybook)

## Why This Matters

1. **Zero runtime cost** — CSS variables resolve at browser level, no JS re-renders on theme change
2. **MFA-compatible** — all micro-frontends share the same CSS variables via the host's `<html>` attribute
3. **SCSS mixins reusable** — `@mixin ellipsis($line)`, `@mixin flex-row($gap)` etc. provide utility without runtime overhead
4. **Ant Design integration** — Ant's CSS overrides live alongside SCSS in sirius package
