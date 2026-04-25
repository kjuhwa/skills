---
version: 0.1.0-draft
name: shadcn-base-ui-not-radix
summary: This monorepo uses shadcn with the Base UI variant (@base-ui/react) not Radix — different primitive library under the same shadcn developer experience.
category: decision
tags: [shadcn, base-ui, radix, ui-library, components]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLAUDE.md
imported_at: 2026-04-18T00:00:00Z
---

Shadcn CLI supports multiple underlying primitive libraries. The project chose the Base UI variant (`@base-ui/react` instead of `@radix-ui/react-*`). Components are installed via `pnpm ui:add <name>` which shells out to shadcn, writing to `packages/ui/components/ui/`.

`packages/ui/components.json` configures this: `"style": "base-nova"`, variant uses Base UI imports.

## Why

Base UI is shadcn's newer primitive family (same authors as Radix); chose it over Radix for the specific monorepo. Practical consequence: component files import `from "@base-ui/react/..."` not `from "@radix-ui/react-*"`. Copy-pasting examples from shadcn docs requires adapting the imports if docs default to Radix.

Workflow: `pnpm ui:add badge` (from repo root) installs Badge into `packages/ui/components/ui/badge.tsx`, using Base UI under the hood. Components use shadcn design tokens (`bg-background`, `text-muted-foreground`) — never hardcoded Tailwind colors.

## Evidence

- CLAUDE.md, "UI/UX Rules" — explicit Base UI note.
- `packages/ui/components.json` — shadcn config declaring Base UI variant.
- `package.json:14` — `ui:add` script.
