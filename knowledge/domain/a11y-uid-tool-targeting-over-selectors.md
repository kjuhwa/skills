---
version: 0.1.0-draft
name: a11y-uid-tool-targeting-over-selectors
summary: For agent-driven browser automation, targeting DOM elements by short server-assigned UIDs emitted in an a11y-tree snapshot is dramatically more reliable than asking the agent to construct CSS selectors or XPath.
category: domain
confidence: high
tags: [agent-ux, a11y, uid, selector, element-targeting]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/tools/snapshot.ts
imported_at: 2026-04-18T00:00:00Z
---

# UID-Based Element Targeting Beats Selector Synthesis

## Context

Historically, browser automation tools exposed `page.click(selector)` / `page.fill(selector, value)` with CSS or XPath selectors. For a human writing test code, that's fine — they pick a stable selector. For an LLM agent that sees "the Submit button" in screenshots or HTML, it has to *synthesize* a selector, and those selectors are brittle:

- Class names change across deploys.
- `nth-child` is sensitive to ads/A-B tests.
- Exact text match fails on i18n or whitespace.

## The fact / decision / pitfall

Pattern: the server emits a text snapshot of the accessibility tree with a short numeric UID per node (`uid=42 button "Submit"`). Tools that operate on elements (`click`, `fill`, `hover`, `drag`) take a `uid` parameter and the server maps it back to a Puppeteer `ElementHandle` internally.

Key properties:

- UIDs are session-scoped and snapshot-scoped. The agent calls `take_snapshot` first, then uses the uids. They are not stable across snapshots.
- The a11y tree matches what DevTools' Elements > Accessibility pane shows, so developer conversations about "that button" map 1:1 to what the agent sees.
- Nodes with `role="presentation"` or no role may be absent from a non-verbose snapshot; `verbose: true` brings them in.

## Evidence

- `src/tools/snapshot.ts::takeSnapshot` — emits a11y tree with uids.
- `src/formatters/SnapshotFormatter.ts::#getAttributes` — includes `uid=${node.id}` as the first attribute.
- Downstream tools (`src/tools/input.ts` etc.) take `uid` and call `page.getElementByUid(uid)`.

## Implications

- The first rule in the tool-use instructions for agents: "Always take a snapshot before acting" — the uid lifecycle mandates it. Make this a prominent line in your tool descriptions, not an afterthought.
- Shadow DOM, iframes, and SVG might be under-represented in the a11y tree depending on the implementation. Give the agent an escape hatch (evaluate_script or css selector fallback) for those.
- A uid scheme that's stable across snapshots (e.g. deterministic hash of node identity) is tempting but dangerous — the agent will cache them and act stale. Keep uids per-snapshot and make that a contract.
- Mark the currently-selected DevTools element in the snapshot. It bridges human-picked context into the agent's view — critical for mixed-drive workflows.
