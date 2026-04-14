---
description: Preview skills in kjuhwa/skills.git matching a keyword without installing
argument-hint: <keyword> [--category=<name>]
---

# /skills_search $ARGUMENTS

Read-only search of the remote skill repository.

## Steps

1. Ensure `~/.claude/skills-hub/remote/` exists and is fresh (see `/init_skills` step 1).
2. Load `index.json` or walk `**/SKILL.md`.
3. Filter by keyword (name/description/tags/triggers/category, case-insensitive) and optional `--category`.
4. For each match, output:
   ```
   <category>/<skill-name>  v<version>
     description: ...
     tags: [..]
     triggers: [..]
     path: remote/skills/<category>/<skill-name>/
   ```
5. If user asks to view one, read its `content.md` and display.

## Rules

- Never write anything. No registry update, no install.
- If no matches, suggest related categories and 3 closest tags by edit distance.
