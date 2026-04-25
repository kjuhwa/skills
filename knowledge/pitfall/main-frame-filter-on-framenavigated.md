---
version: 0.1.0-draft
name: main-frame-filter-on-framenavigated
summary: Puppeteer's `framenavigated` event fires for every frame including iframes, not just the top-level page; if your event-collector splits storage on each `framenavigated` without filtering to `frame === page.mainFrame()`, every iframe navigation rotates your buckets and loses the current request list.
category: pitfall
confidence: high
tags: [puppeteer, framenavigated, iframe, event-collection]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/PageCollector.ts
imported_at: 2026-04-18T00:00:00Z
---

# `framenavigated` Fires For Iframes Too

## Context

Many tools implement "network requests / console messages since the last navigation" by listening for `page.on('framenavigated', ...)` and starting a new bucket. This is often what the developer tested, because test pages rarely have cross-origin iframes.

## The fact / decision / pitfall

`framenavigated` fires for *every* frame, including nested iframes. A site with an auto-refreshing ad iframe will rotate your storage on every ad refresh, wiping the current navigation's event list mid-session.

The fix is a one-line guard:

```ts
page.on('framenavigated', (frame) => {
  if (frame !== page.mainFrame()) return; // <-- the critical line
  // rotate storage buckets
});
```

## Evidence

- `src/PageCollector.ts`: `listeners['framenavigated'] = (frame: Frame) => { if (frame !== page.mainFrame()) return; this.splitAfterNavigation(page); };`
- `PageEventSubscriber.#onFrameNavigated`: same filter, same comment: `// Only split the storage on main frame navigation`.

## Implications

- Also applies to `issue` aggregator resets and any "reset on navigate" side effect. If it should happen once per user-visible navigation, filter to main frame.
- If you *do* want per-frame scoping, the main-frame filter isn't enough; you also need per-frame storage keyed by `frame._id` (private). That's a different design decision — be explicit.
- Test coverage for this is easy to miss: write a test that loads a page with a nested iframe that navigates repeatedly, and assert that top-level-frame events still appear in the current bucket.
- CDP has finer-grained navigation events (`Page.frameStartedNavigating`, `Page.frameNavigated`). They also need main-frame filtering for the same reason.
