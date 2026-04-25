---
version: 0.1.0-draft
name: semantic-design-tokens-only
summary: Use semantic design tokens (bg-background, text-muted-foreground) for all styling — never hardcoded Tailwind colors (text-red-500, bg-gray-100) in view code.
category: decision
tags: [design-tokens, tailwind, styling, dark-mode]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLAUDE.md
imported_at: 2026-04-18T00:00:00Z
---

Only semantic design tokens in view code:

```html
<div class="bg-background text-foreground border-border">
  <p class="text-muted-foreground">Subtitle</p>
</div>
```

Hardcoded Tailwind colors are banned:

```html
<!-- WRONG -->
<div class="bg-gray-100 text-gray-900">
<p class="text-red-500">Error</p>
```

## Why

Semantic tokens swap automatically based on theme (light/dark), whereas hardcoded colors freeze the UI in one mode. The token layer also lets a designer shift "the warning color" globally by updating one CSS variable — not grepping for `red-500` through 500 files.

Shared styles live in `packages/ui/styles/` so both apps (web + desktop) consume the same variable definitions. Never duplicate scrollbar styling, keyframes, or base-layer rules in app-specific CSS — they drift.

For Tailwind to see class names in shared packages, use `@source` directives in each app's CSS to scan the shared package tree.

## Evidence

- CLAUDE.md, "CSS Architecture" and "UI/UX Rules" sections.
- `packages/ui/styles/` — single source of truth for tokens.
