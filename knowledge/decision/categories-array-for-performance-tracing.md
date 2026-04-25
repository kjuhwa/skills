---
version: 0.1.0-draft
name: categories-array-for-performance-tracing
summary: To get a trace that DevTools' TraceEngine can parse with full insights, you must start `page.tracing.start` with the same category array DevTools uses internally — missing a `disabled-by-default-devtools.*` category silently drops insights you'd otherwise get.
category: decision
confidence: high
tags: [chrome-tracing, cdp, categories, devtools, performance]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/tools/performance.ts
imported_at: 2026-04-18T00:00:00Z
---

# Trace Category List for DevTools-Compatible Traces

## Context

A `puppeteer`/`CDP` consumer that calls `page.tracing.start({categories: ['devtools.timeline']})` *gets* a trace, but a lot of downstream insight extraction silently does nothing because the `disabled-by-default-*` categories aren't enabled. DevTools panels rely on opting *in* to each of these.

## The fact / decision / pitfall

Use exactly this category array (sync with `third_party/devtools-frontend/src/front_end/panels/timeline/TimelineController.ts` on each dependency bump):

```ts
const categories = [
  '-*',
  'blink.console',
  'blink.user_timing',
  'devtools.timeline',
  'disabled-by-default-devtools.screenshot',
  'disabled-by-default-devtools.timeline',
  'disabled-by-default-devtools.timeline.invalidationTracking',
  'disabled-by-default-devtools.timeline.frame',
  'disabled-by-default-devtools.timeline.stack',
  'disabled-by-default-v8.cpu_profiler',
  'disabled-by-default-v8.cpu_profiler.hires',
  'latencyInfo',
  'loading',
  'disabled-by-default-lighthouse',
  'v8.execute',
  'v8',
];
await page.tracing.start({categories});
```

The leading `'-*'` disables all categories by default; the rest explicitly enable the subset needed. Without `disabled-by-default-devtools.screenshot` you lose the thumbnail filmstrip. Without `.timeline.stack` you lose call frames for cpu_profiler. Without `blink.user_timing` you lose `performance.mark`/`measure` entries.

## Evidence

- `src/tools/performance.ts::startTrace` — the exact list, with a source-link comment to chromium for synchronization.
- Lighthouse's `gather/gatherers/trace.js` uses essentially the same list.

## Implications

- Keep the category array as a named constant, linked to upstream Chromium in a comment. Review it every Chrome major update.
- If you add a custom category for your app's metrics, add it here too; the categories are whitelist-style (`-*` default).
- If you ever tried "less is more" by cutting categories to shrink trace file size, you will silently lose insight coverage. Instead, gzip the output (`.json.gz`) — order-of-magnitude reduction with no signal loss.
- For Core Web Vitals work specifically (LCP, INP, CLS), all the `loading` and `devtools.timeline` categories are required; don't skip them.
