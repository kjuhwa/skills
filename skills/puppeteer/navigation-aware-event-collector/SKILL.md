---
name: navigation-aware-event-collector
description: Store browser events (network requests, console messages, issues) in per-page WeakMaps split by main-frame navigation so tools can ask for "requests since the last navigation" vs. "requests across the last N navigations" without leaking memory.
category: puppeteer
version: 1.0.0
version_origin: extracted
tags: [puppeteer, cdp, weakmap, event-collection, navigation]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/PageCollector.ts
imported_at: 2026-04-18T00:00:00Z
---

# Navigation-Aware Event Collector

## When to use

- Your tool exposes "show me all console messages" or "list network requests" for a long-lived browser.
- Users expect the default query to scope to the current navigation (like DevTools panels do), with an optional "include preserved" for history.
- You need stable, short numeric IDs (`reqid=42`) for each event that survive across tool calls but aren't globally unique forever.

## How it works

- Store events in `WeakMap<Page, Array<Array<Event>>>`. Outer array is a per-navigation list, newest first; inner array is the events collected during that navigation.
- On `framenavigated` (main frame only!) unshift a new empty sub-array and slice to `maxNavigationSaved` (e.g. 3) to cap memory.
- Tag each event with a monotonic `stableIdSymbol` via a per-page id generator so you can say `getById(page, 42)` even after sub-arrays rotate.
- Default `getData(page)` returns `navigations[0]` (current navigation). `getData(page, includePreserved=true)` concatenates all preserved navigations in oldest-first order for chronological display.
- Use `browser.on('targetcreated' / 'targetdestroyed')` to attach/detach listeners, and clean up the `WeakMap` entry on destruction so closed tabs don't pin their event history.

## Example

```ts
export class PageCollector<T> {
  protected storage = new WeakMap<Page, Array<Array<WithSymbolId<T>>>>();
  protected maxNavigationSaved = 3;

  #initializePage(page: Page) {
    const idGen = createIdGenerator();
    this.storage.set(page, [[]]);
    const listeners = this.#listenersInitializer(value => {
      (value as WithSymbolId<T>)[stableIdSymbol] = idGen();
      this.storage.get(page)![0].push(value);
    });
    listeners.framenavigated = (frame) => {
      if (frame !== page.mainFrame()) return;
      const navs = this.storage.get(page)!;
      navs.unshift([]);
      navs.splice(this.maxNavigationSaved);
    };
    for (const [name, l] of Object.entries(listeners)) page.on(name, l);
  }

  getData(page: Page, includePreserved = false): T[] {
    const navs = this.storage.get(page) ?? [];
    if (!includePreserved) return navs[0] ?? [];
    const out: T[] = [];
    for (let i = this.maxNavigationSaved; i >= 0; i--) if (navs[i]) out.push(...navs[i]);
    return out;
  }
}
```

## Gotchas

- Filter `framenavigated` to `frame === page.mainFrame()`. Otherwise every iframe navigation rotates storage and you lose the current request list.
- For network requests specifically, don't blindly rotate on navigation — move the tail of requests belonging to the new navigation into the new bucket (the nav request itself plus everything after). Otherwise the first in-flight request of the new page gets orphaned in the old bucket.
- `Symbol('stableId')` used as a map key: if you serialize to JSON elsewhere, that symbol is invisible — it's an explicit map from event back to id, not a user-visible field.
- `WeakMap` is correct here because event retention must die with the Page. Don't replace it with a regular Map during debugging; you will cause slow leaks.
- Listener cleanup on `targetdestroyed` must mirror every listener you added, or the Page object is pinned via listener closures and the WeakMap never drops it.
