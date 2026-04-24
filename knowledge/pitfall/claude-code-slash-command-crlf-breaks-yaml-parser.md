---
version: 0.1.0-draft
name: claude-code-slash-command-crlf-breaks-yaml-parser
type: knowledge
category: pitfall
tags: [claude-code, slash-command, yaml, crlf, windows, frontmatter, silent-failure]
summary: Claude Code's slash-command YAML frontmatter parser silently falls back to the H1 body when files have CRLF line endings, and also hides argument-hint completely.
source: { kind: session, ref: hub-v2.5.3-release }
confidence: high
linked_skills: []
supersedes: null
extracted_at: 2026-04-18
---

## Fact

Slash-command definition files at `~/.claude/commands/*.md` must use **LF** line endings, not CRLF. When a file has CRLF:

1. The parser reads `description: <value>\r` — the trailing `\r` stays inside the string value.
2. The parser then *silently* discards the value (no error surfaced).
3. UI falls back to the markdown body's H1 line (e.g. `# /hub-foo $ARGUMENTS`) as the displayed description.
4. `argument-hint` is not rendered in the tab-completion popover at all.

## Context / Why

- YAML 1.1/1.2 allows `\r\n` line endings, but Claude Code's parser (as of 2026-04) treats `\r` as part of the scalar value when reading line-by-line. The trailing `\r` then fails a downstream validation / whitespace check.
- The failure is silent — no log, no toast. The symptom is the description showing literal `/<name> $ARGUMENTS` and no parameter hints.
- Default `git config core.autocrlf=true` on Windows reintroduces CRLF on every checkout, so naive `sed -i 's/\r$//'` fixes get reverted by the next `/hub-commands-update` or `git pull`.

## Evidence

```bash
$ od -c ~/.claude/commands/hub-precheck.md | head -1
0000000   -   -   -  \r  \n   d   e   s   c   r   i   p   t   i   o   n

$ # Before fix: command palette shows "/hub-precheck $ARGUMENTS"
$ sed -i 's/\r$//' ~/.claude/commands/hub-precheck.md
$ # After fix: "스킬 허브 사전 검증 (lint + master/lite/category 인덱스 재생성)"
```

Affected about 20+ commands during this session's bootstrap v2.5.x work until the root cause was identified.

## Applies when

- You author or ship slash commands on Windows.
- You distribute slash commands via a git repo cloned on mixed-OS machines.
- You notice descriptions rendering as `/<name> $ARGUMENTS` or missing argument-hint tooltips.

## Counter / Caveats

- Fix strategy must be **at the repo level** via `.gitattributes`:
  ```gitattributes
  bootstrap/commands/*.md text eol=lf
  bootstrap/tools/*.{py,sh} text eol=lf
  bootstrap/bin/* text eol=lf
  ```
- One-shot local cleanup: `find ~/.claude/commands -name 'hub-*.md' -exec sed -i 's/\r$//' {} +`
- Verify with `od -c <file> | head -1` — the sentinel `---` should be followed by `\n`, not `\r\n`.
- BOM (byte-order mark) at file start would cause a different failure mode (parser rejects frontmatter entirely). Not the same issue.
