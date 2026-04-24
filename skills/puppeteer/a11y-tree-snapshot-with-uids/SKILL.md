---
name: a11y-tree-snapshot-with-uids
description: Give agents an indented text snapshot of the page's accessibility tree where every node has a short opaque `uid` they can pass back to click/fill/hover tools, instead of asking the agent to construct CSS selectors.
category: puppeteer
version: 1.0.0
version_origin: extracted
tags: [accessibility, a11y, agent-ux, element-resolution, snapshot]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/formatters/SnapshotFormatter.ts
imported_at: 2026-04-18T00:00:00Z
---

# A11y Tree Snapshot with Opaque UIDs

## When to use

- You're building browser automation for an LLM agent and want reliable element targeting without brittle CSS selectors.
- Users / agents repeatedly fumble "select the login button" with screenshots+vision because class names change.
- You need a compact, diffable representation of the page the agent can read and reason about.

## How it works

- Walk Chrome's accessibility tree (via Puppeteer's `page.accessibility.snapshot()` or CDP `Accessibility.getFullAXTree`). Each node gets a short unique `uid` generated server-side (e.g. `1`, `2`, … or `${frameIdx}_${nodeIdx}`).
- Serialize as indented text: `uid=3 button "Submit" focused` — role, name, useful booleans. Keep it narrow; two spaces per depth.
- Provide a `verbose` mode that includes every a11y attribute. Default is terse — agents are more accurate on focused snapshots.
- Store the server-side mapping `uid → ElementHandle` on the page object. Every tool that takes a uid (`click(uid)`, `fill(uid, value)`) resolves it via `page.getElementByUid(uid)` before acting.
- If the user has an element selected in DevTools, mark it in the snapshot: `uid=3 button "Submit" [selected in the DevTools Elements panel]`. Bridges human + agent collaboration.
- Expose an optional `filePath` for snapshots to write to disk instead of the response, so very large pages don't consume context.

## Example

```ts
// formatter - indent by depth, role + name + attrs
#formatNode(node: TextSnapshotNode, depth = 0): string {
  const attrs = [`uid=${node.id}`];
  if (node.role) attrs.push(node.role === 'none' ? 'ignored' : node.role);
  if (node.name) attrs.push(`"${node.name}"`);
  for (const [k, v] of Object.entries(node)) {
    if (EXCLUDED.has(k)) continue;
    if (v === true) attrs.push(k);
    else if (typeof v === 'string' || typeof v === 'number') attrs.push(`${k}="${v}"`);
  }
  let line = ' '.repeat(depth * 2) + attrs.join(' ');
  if (node.id === selectedElementUid) line += ' [selected in the DevTools Elements panel]';
  return line + '\n' + node.children.map(c => formatNode(c, depth + 1)).join('');
}

// consumer tools resolve uid back to a handle
const el = await page.getElementByUid(request.params.uid);
await el.click();
```

## Gotchas

- UIDs must be stable *for the snapshot instance* but can change across snapshots. Always tell the agent to call snapshot first, then act — never cache uids across tool calls.
- The a11y tree does NOT include every DOM element. For elements with `role="presentation"` or no accessible role, give agents an escape hatch (`evaluate_script` or a CSS selector fallback), or emit them under a `generic` role with enough attrs to disambiguate.
- A page that uses shadow DOM or iframes extensively produces a fragmented tree. Walk into shadow roots and iframes explicitly; document the constraint.
- The `verbose` flag should be off by default. Verbose snapshots are 5-10x larger and agents only rarely need the extra attributes.
- If the selected DevTools element isn't in the (non-verbose) a11y tree, emit a hint that instructs the agent to re-snapshot with `verbose: true` — otherwise they'll loop confused.
