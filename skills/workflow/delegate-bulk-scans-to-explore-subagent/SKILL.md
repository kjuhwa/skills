---
name: delegate-bulk-scans-to-explore-subagent
description: Scan-heavy slash commands (repo imports, full-project extracts, corpus-wide refactors) must delegate bulk file/web scanning to an Agent(subagent_type=Explore) in a single call, then synthesize drafts in the main thread. Prevents the 50-70 tool call thrashing that fragments conversation history.
category: workflow
tags: [slash-command, claude-code, subagent, explore, performance, token-budget, scan]
triggers: [hub-import, hub-extract, hub-refactor, "scan repo", "extract patterns", "too many tool calls", 73, "back and forth"]
source_project: skills-hub-bootstrap-v2.6.1
version: 0.1.0
---

# delegate-bulk-scans-to-explore-subagent

## Problem

Claude Code slash commands that scan many files (`/hub-import`, `/hub-extract`, `/hub-refactor`, `/hub-condense`, `/hub-cleanup`, `/hub-research`) produced ~70 tool calls per run when the main-thread AI iterated `Read` across files. Side effects:

- **Token budget**: each `Read` eats a slice of context that persists for the rest of the session.
- **History fragmentation**: the user sees a 10-minute log of back-and-forth instead of one task.
- **No quality gain**: the AI rarely needed the full content of 70 files — it needed a ranked list of candidates.

Observed live during a `/hub-import` run: 73 tool calls, ~10 min, ~400KB of tool output, for a result that could have been a 10-line candidate table.

## Pattern

In the slash command body, inject a MUST-level directive that pins the scan to an `Explore` subagent:

```markdown
## Execution strategy

Bulk scanning MUST be delegated to an `Explore` subagent. The main thread
only synthesises drafts from the returned candidate list.

```
Agent(
  subagent_type="Explore",
  description="<short task name>",
  prompt="""
<command-specific brief: what to scan, criteria, ranking rule>

Return a ranked list (top N) with: name, kind, category,
1-line description, source path(s), confidence.
""",
)
```

After the subagent returns, read ONLY the few MDs needed to write final
drafts. Do NOT iterate `Read` across dozens of files in the main thread.
```

The brief must be **specific and verifiable**. Include:
- Exact paths or URLs to scan
- Criteria for what counts as a candidate
- Ranking rule (so "top N" is reproducible)
- Expected output schema (JSON is easiest to parse)
- A self-check — e.g. "if two candidates have the same body_lines, mark SCAN_INVALID"

## Why

- **Isolation**: the subagent's context is separate. Its ~70 reads don't pollute the main thread's token budget.
- **Summary at return**: you get the ranked result, not raw file contents.
- **Verifiability**: the JSON schema makes it trivial to sanity-check before acting.

## Example

Before (main-thread scan):
```
/hub-import <url>
→ Read repo README, Read each SKILL.md in external repo,
  Read ../knowledge/**/*.md, ... × 70 calls ...
→ Write draft × 6
Total: 73 tool calls, 10 min
```

After (delegated):
```
/hub-import <url>
→ Agent(Explore, "scan <url>, rank candidates, return JSON")
→ Read specific 3 MDs for final citations
→ Write draft × 6
Total: ~5-8 tool calls, 2-3 min
```

## When to use

- Any slash command that scans more than ~10 files.
- Any repo-import, full-project extract, corpus-wide refactor/cleanup.
- Any web research task that reads multiple URLs.

## When NOT to use

- Single-file operations (Read, Edit, small-fix workflows).
- Cases where you actually need the full content in-context (writing a detailed comparison, summarising a specific long document).

## Pitfalls

- **Subagent output can silently fail**. Duplicated metric values, all-zero counts, empty result lists. Always require a self-check in the brief. See paired knowledge entry `subagent-scan-results-need-sanity-check`.
- **Don't inline code with `Agent(...)`** — the subagent is a tool the AI invokes, not a programmatic API. The command body only tells the AI what brief to pass.
- **Keep the brief self-contained**. The subagent has no conversation history.
