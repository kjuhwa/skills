---
version: 0.2.0-draft
name: figma-driven-ai-react-design-system
description: "Figma tokens → Tailwind theme, AI-explored React variants via Code Connect binding, semantic-token discipline enforced"
category: frontend
tags:
  - figma
  - react
  - tailwind
  - design-tokens
  - ai
  - code-connect
  - design-system

composes:
  - kind: skill
    ref: design/figma-token-to-tailwind-theme
    version: "*"
    role: token-pipeline
  - kind: skill
    ref: frontend/figma-code-connect-react
    version: "*"
    role: figma-react-binding
  - kind: skill
    ref: misc/design-an-interface
    version: "*"
    role: ai-variant-explorer
  - kind: knowledge
    ref: decision/semantic-design-tokens-only
    version: "*"
    role: style-discipline
  - kind: knowledge
    ref: pitfall/ai-guess-mark-and-review-checklist
    version: "*"
    role: gap-guard

recipe:
  one_line: "Take Figma tokens through Tailwind v4 theme generation, AI-explore radically different React component variants in parallel, bind via Code Connect, enforce semantic-tokens-only."
  preconditions:
    - "Figma file with Token Studio plugin producing JSON exports"
    - "React + Tailwind v4 frontend consuming @theme CSS custom properties"
    - "AI agent capacity to spawn parallel sub-agents for variant exploration"
  anti_conditions:
    - "Single-mode design (no dark/light/contrast theme variants) — token pipeline overhead is unjustified"
    - "Non-Tailwind CSS (CSS-in-JS, Styled Components, Emotion) — @theme target mismatch"
    - "Component shape pre-locked by spec — AI variant exploration is wasted budget"
    - "No Figma source (purely code-driven design) — Token Studio + Code Connect have no input"
  failure_modes:
    - signal: "AI-generated components use hardcoded Tailwind colors (text-red-500, bg-gray-100) instead of semantic tokens"
      atom_ref: "knowledge:decision/semantic-design-tokens-only"
      remediation: "Lint output for hardcoded color classes; reject and regenerate with explicit semantic-token instruction in the AI prompt"
    - signal: "AI fills design gaps (spacing, padding, breakpoints) the Figma source didn't specify"
      atom_ref: "knowledge:pitfall/ai-guess-mark-and-review-checklist"
      remediation: "Annotate every AI-generated value inline with `// ai-guess:`; produce a review checklist sidecar; require human review before merge"
    - signal: "Figma component variants drift from React props after Figma rename or restructure"
      atom_ref: "skill:frontend/figma-code-connect-react"
      remediation: "Co-locate *.figma.tsx files with components; CI runs `figma connect publish --dry-run` to detect drift"
  assembly_order:
    - phase: tokens
      uses: token-pipeline
    - phase: figma-binding
      uses: figma-react-binding
    - phase: explore
      uses: ai-variant-explorer
      branches:
        - condition: "variants generated"
          next: enforce
        - condition: "no clear winner"
          next: explore
    - phase: enforce
      uses: style-discipline
      branches:
        - condition: "hardcoded colors found"
          next: explore
        - condition: "semantic-tokens only"
          next: review
    - phase: review
      uses: gap-guard

binding: loose

verify:
  - "every composes[].ref is installed in the hub"
  - "every composes[].version range intersects the installed version"
  - "the token pipeline runs before any AI variant exploration begins"
  - "the style-discipline lint must pass with zero hardcoded color classes before review"
---

# Figma-Driven AI React Design System

> A pipeline that takes Figma design tokens through Tailwind v4 `@theme` generation, dispatches parallel AI sub-agents to explore radically different React component variants on top of the resulting tokens, binds the chosen variant back to Figma via Code Connect, and gates the output through two discipline checks: semantic-tokens-only (no hardcoded Tailwind colors) and the AI-gap review checklist.

<!-- references-section:begin -->
## Composes

**skill — `design/figma-token-to-tailwind-theme`**  _(version: `*`)_
token-pipeline

**skill — `frontend/figma-code-connect-react`**  _(version: `*`)_
figma-react-binding

**skill — `misc/design-an-interface`**  _(version: `*`)_
ai-variant-explorer

**knowledge — `decision/semantic-design-tokens-only`**  _(version: `*`)_
style-discipline

**knowledge — `pitfall/ai-guess-mark-and-review-checklist`**  _(version: `*`)_
gap-guard

<!-- references-section:end -->

## When to use

- Designer-driven design system where Figma is the source of truth and React is the consumer
- Multi-mode theming (dark/light/contrast) — token pipeline pays off here
- Component spec is open enough that exploring 3-5 variants is informative
- AI agent capacity is available — parallel variant exploration is the technique's leverage point

## When NOT to use

- Single-mode design with no theme variants — token pipeline overhead is unjustified
- Non-Tailwind CSS architecture (CSS-in-JS, Styled Components, Emotion) — `@theme` target mismatch
- Component shape pre-locked by spec — AI variant exploration is wasted budget
- No Figma source — Token Studio + Code Connect have no upstream input

## Phase sequence

```
[0] Tokens          → Figma Token Studio JSON → Style Dictionary v5 → Tailwind v4 @theme
[1] Figma binding   → @figma/code-connect maps Figma variants ↔ React props
[2] Explore         → AI sub-agents generate N radically different React variants on the tokens
[3] Enforce         → semantic-tokens-only lint (no hardcoded text-red-500, bg-gray-100)
[4] Review          → ai-guess inline marker + review-checklist.md sidecar
```

### [0] Tokens

`figma-token-to-tailwind-theme` runs first because every later phase depends on the resulting `@theme` CSS custom properties. The pipeline is dark/light/contrast-aware — three theme variants drop out simultaneously. Breaking-change detection runs against the prior commit's tokens; sudden token name changes block downstream work until reviewed.

### [1] Figma binding

`figma-code-connect-react` binds Figma component variants to React props via co-located `*.figma.tsx` files. This is **per-component**, not global — only run for components that have a Figma source. The binding is one-way: Figma is canonical for variants, React is canonical for behavior.

### [2] Explore

`design-an-interface` dispatches N parallel sub-agents (typical: 3-5) to produce radically different React variants on top of the tokens from [0]. Each variant respects the bound props from [1] but explores layout, density, interaction surface freely. Output is a side-by-side comparison the human picks from.

### [3] Enforce

`semantic-design-tokens-only` is a **knowledge/decision**, not a skill — but the technique elevates it to a lint pass. Any hardcoded Tailwind color class in the AI output (`text-red-500`, `bg-gray-100`) fails the gate; the variant goes back to [2] with an explicit "use only `bg-background`, `text-muted-foreground`, etc." prompt. The discipline survives precisely because the lint is mechanical, not aspirational.

### [4] Review

The final gate. `ai-guess-mark-and-review-checklist` requires every AI-generated value the Figma source didn't specify to be inline-marked (`// ai-guess: spacing 24px / 2026-04-26`). A sidecar `review-checklist.md` accumulates open items. The component cannot ship until the checklist is empty (either accept the guess or replace it).

## Glue summary

| Added element | Where |
|---|---|
| Token pipeline gates all later phases (depends on @theme output) | Phase 0 ordering |
| Figma binding is per-component, not global, and one-way | Phase 1 scope |
| Parallel AI exploration with shared token vocabulary | Phase 2 dispatch |
| Mechanical lint converts knowledge/decision into a hard gate | Phase 3 gate |
| AI-fill marker + review checklist gates publish | Phase 4 gate |

## Failure modes (mapped to atoms)

| Failure signal | Caused by | Remediation |
|---|---|---|
| Hardcoded Tailwind colors in output | `decision/semantic-design-tokens-only` (lint not run) | Mechanical lint; reject + regenerate with semantic-token-only prompt |
| AI fills unspecified design values | `pitfall/ai-guess-mark-and-review-checklist` (not applied) | Inline marker + review-checklist.md gate before publish |
| Figma↔React variant drift after rename | `skill/frontend/figma-code-connect-react` (not CI-checked) | `figma connect publish --dry-run` in CI; co-located *.figma.tsx |

## When the technique is succeeding (success signals)

- The Tailwind theme regenerates without breaking-change flags after a Figma token edit
- AI variant exploration produces 3-5 distinguishable options the human can pick between in <5 minutes
- The semantic-tokens lint reports zero hardcoded color classes on the chosen variant
- `review-checklist.md` is empty by the time the component is merged
- A subsequent Figma rename triggers a CI failure on the Code Connect dry-run, surfacing the drift before it reaches main

## Known limitations

- Phase 2's AI exploration assumes the token vocabulary covers the design space. If Figma has tokens that Tailwind v4's `@theme` cannot express (custom blend modes, advanced gradients), the variants will land closer to each other than the designer intended.
- Phase 3's lint catches hardcoded *colors* but not hardcoded *spacing* or *typography*. Extending the lint is straightforward but currently each project ships its own list.
- Phase 4 relies on humans actually reading the checklist. If the team treats it as a rubber stamp, the silent-failure risk returns.
- The technique assumes a Token Studio → Style Dictionary v5 → Tailwind v4 toolchain. Older toolchains (SD v3, Tailwind v3, raw CSS variables) need a different phase 0 atom.

## Why exists

Each composed atom solves one specific concern: token pipeline (formats), Figma↔React binding (variants), AI variant exploration (creativity at scale), semantic-tokens-only (style discipline), AI-gap guard (publish gate). None of them know they belong together. A team faced with "designer just shipped a new Figma component; produce the React equivalent in our design system" would otherwise wire these five together every time, with subtly different gate orderings. This technique is the canonical wiring — five atoms, fixed phase sequence, two mechanical gates between AI output and merge.
