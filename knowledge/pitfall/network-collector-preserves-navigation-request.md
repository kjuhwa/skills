---
version: 0.1.0-draft
name: network-collector-preserves-navigation-request
summary: A network-request collector that splits storage at `framenavigated` must migrate the tail of in-flight requests (from the navigation request forward) into the new navigation's bucket; otherwise the nav request and early same-nav requests get orphaned in the previous bucket.
category: pitfall
confidence: medium
tags: [puppeteer, network, navigation, event-collection]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/PageCollector.ts
imported_at: 2026-04-18T00:00:00Z
---

# Network Collector Must Migrate Nav Request on Split

## Context

The `PageCollector` pattern stores events in per-navigation buckets and rotates at `framenavigated`. For console messages or issues, a simple `unshift([])` works — the new bucket starts empty. For *network requests*, that's wrong.

## The fact / decision / pitfall

`framenavigated` fires on the *new* URL. By the time it fires, the navigation request itself has already been collected and lives at the tail of the previous bucket. If you simply prepend an empty bucket, the navigation request — arguably the single most important request of the new page — is orphaned in "previous navigation" history.

Fix: override `splitAfterNavigation` for the network collector specifically to find the last navigation request (filtered by `frame === page.mainFrame() && request.isNavigationRequest()`) and migrate from that index forward into the new bucket:

```ts
override splitAfterNavigation(page: Page) {
  const navigations = this.storage.get(page) ?? [];
  const requests = navigations[0];
  const lastNavIdx = requests.findLastIndex(r =>
    r.frame() === page.mainFrame() && r.isNavigationRequest()
  );
  if (lastNavIdx !== -1) {
    const fromCurrentNav = requests.splice(lastNavIdx);
    navigations.unshift(fromCurrentNav);
  } else {
    navigations.unshift([]);
  }
  navigations.splice(this.maxNavigationSaved);
}
```

## Evidence

- `src/PageCollector.ts::NetworkCollector.splitAfterNavigation` — exactly this logic, with comment: "Keep all requests since the last navigation request including that navigation request itself."
- The superclass `PageCollector.splitAfterNavigation` does the simple unshift that works for consoles.

## Implications

- Any "event type X since the last navigation" query that depends on ordering needs to understand whether the splitting event is *before* or *after* the events it emits.
- For redirect chains, the navigation request has a redirect chain of its own — make sure the formatter walks `request.redirectChain()` rather than losing intermediate hops.
- If you paginate or filter in a way that displays "current" vs "previous" buckets, explicitly test the first-page case (immediately after navigation) — the off-by-one shows up there.
- DevTools itself also applies similar preservation logic on "Preserve log" mode; copy its semantics rather than inventing new ones.
