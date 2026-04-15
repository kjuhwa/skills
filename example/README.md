# example/

End-to-end, runnable **example projects** built from (and demonstrating) skills and knowledge in this hub. Unlike `skills/` (snippets) and `knowledge/` (facts), entries here are whole standalone artifacts — tools, dashboards, mini-apps — that someone can clone and run.

## How to use

- Browse the catalog below, pick one, `git clone` or copy its folder.
- Each folder has a self-contained `README.md` with runnable instructions.
- Regenerate this catalog by running `/example_list --refresh` (it re-walks each subfolder's manifest).

## Catalog

| slug | title | stack | created |
|---|---|---|---|
| [skills-explorer](skills-explorer/) | Skills Explorer — offline search dashboard for a local skills-hub checkout | node, html, js | 2026-04-16 |
| [skill-doctor](skill-doctor/)       | Skill Doctor — zero-dep linter for SKILL.md and knowledge/*.md, CI-ready exit codes | node, cli | 2026-04-16 |
| [skill-graph](skill-graph/)         | Skill Graph — browser-based force-directed graph of skills ↔ knowledge relationships | node, html, svg, js | 2026-04-16 |
| [skill-stats](skill-stats/)         | Skill Stats — aggregate KPIs, category donut, ranked tag/project bars | node, html, svg, js | 2026-04-16 |
| [skill-timeline](skill-timeline/)   | Skill Timeline — git-history commit heatmap + top-churned slugs for a hub working copy | node, html, svg, js | 2026-04-16 |
| [skill-tryout](skill-tryout/)       | Skill Tryout — offline TF-IDF trigger matcher REPL for debugging skill discoverability | node, html, js | 2026-04-16 |
| [skill-diff](skill-diff/)           | Skill Diff — per-slug added/modified/removed viewer with description/tag/trigger deltas between two hub refs | node, html, js | 2026-04-16 |

## Adding an example

Use the `/example_add <slug>` slash command from a working copy that contains the artifact. It will:

1. Copy the selected files into `example/<slug>/`
2. Generate `README.md` and `manifest.json`
3. Branch, commit, push, and open a PR
4. Update this catalog

Duplication check: `/make_something` invokes `/example_list` first to avoid rebuilding something already here.
