# skill-diff

> **Why.** The hub gains and loses skills constantly — but there's no release-notes surface. You can `git log`, but a raw log doesn't tell you *which slug* changed or *how its description/triggers/tags differ*. This tool diffs two refs of a hub working copy and shows per-slug added / modified / removed cards with the frontmatter delta expanded inline. Good for audit trails and curation.

## Run

```bash
# 1. compute diff between two refs (defaults: HEAD~20 → HEAD)
node build-diff.mjs --root=~/.claude/skills-hub/remote --from=HEAD~20 --to=HEAD

# 2. browse
node serve.mjs   # → http://localhost:4179/
```

Env `HUB_REPO` overrides `--root`. Refs accept anything `git rev-parse` does — tags, branches, SHAs.

## What you see

- **KPIs**: totals per status (added / modified / removed) + other-file count.
- **Kind mix**: side-by-side counts for `skill`, `knowledge`, `example`, `bootstrap`.
- **Three sections** (added / modified / removed) of collapsible slug cards.
- Expand a card for: description before→after, tags before→after, triggers before→after, and file-level changes.
- Filter chips toggle which kinds show.

Zero dependencies. Three files: `build-diff.mjs`, `serve.mjs`, `index.html`.
