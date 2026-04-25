---
version: 0.1.0-draft
name: navigate-about-blank-before-trace-start
summary: Before starting a reload-based performance trace, first navigate the page to `about:blank` with `waitUntil: 'networkidle0'` to flush previous-page state; otherwise the trace captures residual activity from the outgoing page and pollutes the insights.
category: pitfall
confidence: medium
tags: [performance, tracing, about-blank, puppeteer]
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/tools/performance.ts
imported_at: 2026-04-18T00:00:00Z
---

# Flush to about:blank Before Trace Start

## Context

Starting `page.tracing.start` on a live page means the trace picks up whatever's already in flight — pending idle-callbacks, deferred loads, long-running timers. When you then trigger a reload, the trace spans the tail of the old navigation and the start of the new one, and insights like "DocumentLatency" or "LCPBreakdown" become confused.

## The fact / decision / pitfall

Fix: if the user asked for `reload: true`, navigate to `about:blank` first and wait for network idle:

```ts
if (request.params.reload) {
  await page.pptrPage.goto('about:blank', {waitUntil: ['networkidle0']});
}
const categories = [/* ... */];
await page.pptrPage.tracing.start({categories});
if (request.params.reload) {
  await page.pptrPage.goto(pageUrlForTracing, {waitUntil: ['load']});
}
```

`about:blank` resets the page context. `networkidle0` guarantees no stray pending requests from the previous page leak into the trace window.

## Evidence

- `src/tools/performance.ts::startTrace` — the exact sequence.

## Implications

- This applies any time you need a clean trace baseline: memory snapshots, performance marks, lighthouse snapshots. `about:blank` is the universal reset.
- Don't use `goto('about:blank')` on the user-initiated navigation path — it visibly flashes the browser. This is a tracing-only optimization.
- If `reload: false` (user wants to trace the current state), skip the `about:blank` dance — the trace has a different purpose.
- For repeated trace runs in a loop, always about:blank between runs. Compounded residue across runs shows up as steadily growing LCP numbers that aren't real.
