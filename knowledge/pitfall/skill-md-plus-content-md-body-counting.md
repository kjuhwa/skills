---
version: 0.1.0-draft
name: skill-md-plus-content-md-body-counting
type: knowledge
category: pitfall
tags: [skills-hub, body-size, heuristic, content-md, pitfall]
summary: "Heuristic scanners that compute body_lines from SKILL.md alone will flag every frontmatter-only skill (body in content.md) as a perma-stub. Always sum SKILL.md body + content.md body for size-based conditions."
source:
  kind: session
  ref: hub-refactor archive detection 2026-04-17
confidence: high
linked_skills: [heuristic-scan-iterative-tuning]
---

# Pitfall: measure skill body across SKILL.md *and* content.md

## Fact

In the skills-hub corpus, many skills follow the pattern:

- `SKILL.md` — frontmatter + a 2-line body like `See \`content.md\`.` or just a pointer.
- `content.md` — the actual 50-500 line body.

A heuristic scanner that only reads `SKILL.md`'s body lines sees `body_lines = 0` for all of them and will over-fire on any size-based rule — archive "perma-stub", verbosity scoring, split thresholds, etc.

## Why

The split is a legitimate organizational choice: SKILL.md is the loader-visible contract (frontmatter + short description), content.md is the prose reference. Many Anthropic-ecosystem skill patterns and the gstack template use this split. There is no frontmatter flag marking it — the convention is implicit.

Real incident: the first `/hub-refactor` archive scan at threshold `body_lines < 15 AND draft version` flagged 5 perfectly-substantial skills (`ai-call-with-mock-fallback`, `character-sheet-multi-panel-consistency`, `claude-cli-from-jvm-via-node-wrapper`, `llm-json-extraction`, `mcp-runtime-prompt-refresh`) because they each have a `content.md` with real content and a frontmatter-only SKILL.md.

## How to apply

When scanning skills for size-based rules:

```python
body_lines = len(body.splitlines())  # SKILL.md body
content_md = skill_dir / "content.md"
if content_md.exists():
    extra = content_md.read_text(encoding="utf-8", errors="replace")
    _, extra_body = parse_frontmatter(extra)  # content.md sometimes has its own frontmatter
    body_lines += len(extra_body.splitlines())
    body = body + "\n" + extra_body  # combined text for token/verbosity analysis
```

Knowledge entries don't have this problem — they are single markdown files.

Apply this to:

- `/hub-refactor` archive condition A (perma-stub detection).
- `/hub-refactor` split detection (body size threshold).
- `/hub-condense` dedup (extract blocks from combined body so cross-entry matches hit content.md text too).
- `/hub-condense` compression (compute verbosity + savings over combined body).
- `/hub-cleanup` orphan detection (content.md missing is already flagged; size heuristics should combine).

## Evidence

- Initial `/hub-refactor` run flagged 5 AI-category skills as stubs → all had substantial content.md.
- After combining: those 5 disappeared from candidates; scan surfaced 1 truly-legitimate metadata-empty skill (`dev-controller-tenant-wrapping-helper` at 49 combined lines).
- Fix shipped in `bootstrap/v2.3.0`.

## Counter / Caveats

- A skill with ONLY a content.md (no SKILL.md) isn't a valid skill at all — `/hub-cleanup` orphan check handles that case separately.
- Some skills have nested files under `examples/` that also carry substantive prose. Deciding whether to fold those into body_lines is a product call: default answer is NO, because examples are meant to be standalone and padding them into the size count discourages the "rich examples" pattern.
- For token-budget sizing (as opposed to line-count sizing), you also need to account for SKILL.md frontmatter token weight — not just the body. But line-count heuristics specifically should ignore frontmatter.
