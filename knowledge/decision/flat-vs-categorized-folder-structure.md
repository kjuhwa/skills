---
name: flat-vs-categorized-folder-structure
description: When a content folder crosses ~100 entries, flat structure becomes unnavigable — categorize into ~15–30 semantic buckets even if the tool doesn't require it
category: decision
tags:
  - directory-structure
  - scalability
  - content-organization
---

# Flat vs Categorized Folder Structure

## The threshold

- **Up to ~50 entries**: flat is fine. Alphabetical is enough. Adding categories adds navigation overhead for no gain.
- **50 to 100 entries**: flat still works if entries have descriptive prefixes (`01-foo`, `auth-bar`) — the prefix becomes an implicit category.
- **100+ entries**: flat collapses. Users can't scan, git diffs become noisy, file listings page over. Categorize.

## Why tooling alone doesn't save you

You might think "my CLI has search, users don't need folders". In practice:
- GitHub/GitLab web UI paginate at 100 entries and truncate long folder listings
- `ls`/`find` output overflows screens
- New users browsing for "what's available" can't discover anything
- README catalogs become unmaintainable (one giant table)

Categorization is for *humans reading the filesystem*, not the tool.

## Choosing categories

Good categories:
- **Domain-based** (`messaging`, `auth`, `storage`) — maps to how users think about what they need
- **15–30 categories** — more than 5 (too coarse), fewer than 50 (too granular)
- **Skewed distribution OK** — having `misc` with 30 items and `auth` with 5 is fine

Bad categories:
- Technology-based (`javascript`, `python`) — creates duplicates when content is cross-stack
- Alphabetical ranges (`a-f`, `g-m`) — arbitrary, unhelpful
- Time-based (`2024-q1`) — doesn't reflect content nature

## Cost of migration

Converting flat to categorized after-the-fact:
1. Takes ~30 minutes of human review to classify 500 items
2. Breaks every existing link and URL → need redirect or README updates
3. All downstream tooling that walked `example/*` now needs `example/*/*`

Consequences for tooling:
- Scanners: depth-1 → depth-2 (`find example -mindepth 2 -name manifest.json`)
- URL builders: `example/foo/` → `example/category/foo/`
- Publish automation: `git add example/foo` → `git add example/category/foo`

## When to decide

Decide at project inception if you expect >100 entries. If you're already at 500 flat (too late), migrate ASAP — the cost grows with every new contributor who encodes the flat layout into their muscle memory.

## In this project

- Started flat in `example/`, organic growth to 542 entries before anyone noticed
- Migrated to 28 domain categories in a single PR (542 renames)
- Downstream tooling (`/hub-list-examples`, `/hub-publish-example`, `auto-hub-loop`) all needed updates
- Catalog regeneration became a separate step, decoupled from item PRs — solved long-tail merge conflicts
