---
description: Preview skills in kjuhwa/skills.git matching a keyword without installing
argument-hint: <keyword> [--category=<name>]
---

# /hub-search-skills $ARGUMENTS

Read-only search of the remote skill repository.

> **Tip:** For keyword-based, ranked search with 180+ Korean↔English synonyms (e.g. "스프링 카프카"), prefer `/hub-find` — it scores `name`/`description`/`tags`/`triggers` and returns top-N.

## Steps

1. Ensure `~/.claude/skills-hub/remote/` exists and is fresh (see `/hub-install` step 1).
2. Load `index.json` or walk `**/SKILL.md`.
3. Filter by keyword (name/description/tags/triggers/category, case-insensitive) and optional `--category`.
4. For each match, output:
   ```
   <category>/<skill-name>  v<version> (latest)
     description: ...
     tags: [..]
     triggers: [..]
     path: remote/skills/<category>/<skill-name>/
     versions: v1.0.0, v1.1.0, v1.2.0   # from `git tag -l "skills/<skill-name>/v*" | sort -V`
   ```
5. If user asks to view one, read its `content.md` and display. If they want a specific version, `git -C <remote> show skills/<name>/v<ver>:skills/<category>/<name>/content.md`.

## Rules

- Never write anything. No registry update, no install.
- If no matches, suggest related categories and 3 closest tags by edit distance.
