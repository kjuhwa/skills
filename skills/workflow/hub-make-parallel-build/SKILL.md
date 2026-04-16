---
name: hub-make-parallel-build
description: "Build multiple zero-dep single-file HTML apps in parallel from installed skills/knowledge data, verify, and publish via PR branch"
category: workflow
version: 1.0.0
triggers:
  - hub-make
  - build examples
  - parallel html build
tags: [hub-make, parallel, html, zero-dep, examples, publish]
---

# Hub-Make Parallel Build

## Purpose

Efficient workflow for building multiple self-contained browser apps from skills-hub data in a single session. Each app embeds skill/knowledge data directly as JS constants — no server, no build step, no dependencies.

## When to Activate

- `/hub-make` with multiple candidates selected
- User says "build all" or "전체" after candidate presentation
- Batch creation of hub examples

## Workflow

### 1. Data Collection Phase
Gather all source data upfront before building:
- Read `index.json` for skill metadata (name, category, description)
- Read knowledge `.md` files for content (pitfall, arch, decision categories)
- Export to temp JSON if needed for embedding

### 2. Parallel Build Phase
- Create all project directories in one `mkdir -p` call
- Write all HTML files in parallel `Write` tool calls (no dependencies between projects)
- Each file is self-contained: HTML + CSS + JS in single file, data embedded as JS constants

### 3. Verify Phase
- Run `node -e` checks: confirm `</html>`, `</script>`, `</style>` tags present
- Open all files in browser via `start ""` commands
- Check file sizes are reasonable (10-25KB typical for data-rich single-file apps)

### 4. Publish Phase — ALWAYS via PR branch
```bash
git checkout -b feat/<branch-name>
# copy files + write manifest.json + README.md per example
git add && git commit
git push -u origin <branch>
gh pr create --base main --head <branch>
```
**Never push directly to main.**

## Key Patterns

- **Data embedding**: `const SKILLS=[{n:"name",c:"cat",d:"desc"},...]` — compact but readable
- **Zero-dep dark theme**: CSS custom properties + glassmorphism (`backdrop-filter:blur()`)
- **Search**: TF-IDF in pure JS (~20 lines) with weighted fields
- **Interactivity**: Vanilla JS event delegation, no framework overhead
- **Responsive**: CSS Grid with `auto-fill, minmax()` for card layouts

## Anti-patterns Discovered

- Don't spawn subagents for file writes — they lack tool permissions. Build directly.
- Don't use Python on Windows without `encoding='utf-8'` on every `open()` call.
- Don't assume registry.json uses arrays — it uses dicts keyed by name.
