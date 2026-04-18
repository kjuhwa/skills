---
description: Search knowledge base by keyword and optionally inject top matches into current context
argument-hint: <keyword> [--inject] [--top <N>] [--category <cat>] [--tag <tag>]
---

# /hub-search-knowledge $ARGUMENTS

Locate relevant knowledge entries before acting. Optionally inject the top matches into the current conversation so the next step benefits from prior lessons.

> **Tip:** For a ranked cross-corpus search (skills + knowledge) with Korean synonym expansion, `/hub-find --kind knowledge` is often faster than this command's grep flow.

## Steps

1. **Gather index**: enumerate all `~/.claude/skills-hub/knowledge/<cat>/*.md` (+ project `.claude/knowledge/` if present).
2. **Two-pass grep**:
   - Pass 1 (strong): match against frontmatter `name`, `summary`, `tags`, `category`, file title (`# ...`).
   - Pass 2 (weak): match against body sections (`## Fact`, `## Applies when`).
3. **Rank**:
   - Strong-match hits score 3, weak 1.
   - Multiply by confidence weight: `high=1.0`, `medium=0.7`, `low=0.4`.
   - Apply `--category` / `--tag` as filters (not scorers).
4. **Present** top-`N` (default 5):

```
# hub-search-knowledge "token refresh"
1. api/oauth-token-refresh-strategy        conf=medium  score=3.0
   한 줄 요약 ...
2. pitfall/springdoc-opid-collision        conf=high    score=1.7
   ...
```

5. **Inject** (when `--inject`): wrap the top-N entries' `## Fact` + `## Applies when` sections into a `<knowledge-context>` block and append as a system-reminder so the next tool call sees them.
   - Hard cap: 4 KB total injected. Truncate lowest-ranked first.

## Rules

- Read-only.
- Never inject full bodies; only `Fact` + `Applies when` to conserve tokens.
- If zero matches, report "no hits" and suggest `/hub-list-knowledge` to browse.
- Empty keyword → error ("provide at least one keyword").
