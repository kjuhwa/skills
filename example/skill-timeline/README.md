# skill-timeline

> **Why.** `skills-explorer` lets you search the hub; `skill-graph` shows relationships; `skill-stats` shows aggregates. None of them answer *when did what change*, or *which entries have been thrashed*. This tool walks `git log` on a skills-hub working copy and renders a GitHub-style commit heatmap plus a top-churned leaderboard — the "drift over time" view that was missing.

## Run

```bash
# 1. generate timeline.json from a hub working copy (must be a git repo)
node build-timeline.mjs --root=~/.claude/skills-hub/remote --since="1 year ago"

# 2. browse
node serve.mjs   # → http://localhost:4177/
```

`--root` defaults to `~/.claude/skills-hub/remote`. Override with `HUB_REPO` env or the flag.

## What it shows

- **KPIs**: total commits, files changed, active days, authors, peak-day.
- **Heatmap**: one cell per day, colored by commit count (GitHub palette).
- **Top churned**: 20 most-changed skill / knowledge / example / bootstrap slugs.
- **Type mix**: how changes distribute across `skills/`, `knowledge/`, `example/`, `bootstrap/`, `other`.
- **Authors**: commit counts per author.
- **Recent log**: last 30 commits with file counts.

Zero dependencies. Ships three files: `build-timeline.mjs`, `serve.mjs`, `index.html`.
