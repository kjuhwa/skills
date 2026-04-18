---
version: 0.1.0-draft
tags: [decision, triple, styling, paradigm, coexistence]
name: triple-styling-paradigm-coexistence
category: decision
description: Why Tailwind CSS, SCSS modules, and styled-components coexist in the same codebase — migration path, isolation needs, and legacy constraints
source:
  kind: project
  ref: lucida-ui@4b922a9043
---

# Triple Styling Paradigm Coexistence

## Decision
The project uses three CSS approaches simultaneously: Tailwind CSS v4, SCSS modules (464 CSS + 537 SCSS files), and styled-components.

## Rationale

### Tailwind CSS v4 (new work)
- Adopted for the AI Portal and new feature development
- Integrates with the Figma Token Studio → Style Dictionary → `@theme` pipeline
- Performance: utility-first, tree-shakeable, no runtime CSS-in-JS overhead
- Scoped via `nds-root` class + lazyStyleTag to prevent MFA leakage

### SCSS modules (legacy, coexisting)
- 5+ remotes have established SCSS-based styling (customstyles.scss per remote)
- Pre-built component styles from the host (`/host/src/styles/portal/component/*.scss`)
- Full rewrite is impractical — gradual migration only

### styled-components (dynamic/complex)
- Used where CSS needs to be truly dynamic (DrawerResizable drag width, ag-grid overrides)
- Provides component-scoped styles with `!important` overrides for third-party libraries
- Examples: `StyledFilterTargetWrapper`, `StyledAgGridReact`, `GridLayer`

## Trade-offs accepted
- **Bundle size**: Three CSS runtimes increase bundle weight
- **CSS duplication**: Same visual pattern may be expressed differently across paradigms
- **Developer cognition**: Engineers must know when to use which approach

## How to apply
- **New features**: Tailwind CSS with design tokens
- **Existing remote modifications**: Follow existing SCSS patterns in that remote
- **Third-party library overrides**: styled-components for scoped `!important` overrides
- **Never**: Mix paradigms within a single component file
