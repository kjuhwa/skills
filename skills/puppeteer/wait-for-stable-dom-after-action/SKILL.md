---
name: wait-for-stable-dom-after-action
description: After an action like click or fill, wait for a potential navigation and then a debounced MutationObserver quiet period, so subsequent tool calls run against a settled DOM rather than an animating one.
category: puppeteer
version: 1.0.0
version_origin: extracted
tags: [puppeteer, mutation-observer, dom-stability, navigation, waiting]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/WaitForHelper.ts
imported_at: 2026-04-18T00:00:00Z
---

# Wait for Stable DOM After Action

## When to use

- Your automation fires a click / form submit / key press, then immediately runs `take_snapshot` or extracts text. The page is still mutating and you get a flaky half-rendered view.
- Fixed `sleep(500)` is wrong — slow machines miss it, fast ones waste budget.
- You need to tolerate both "this click causes a full navigation" and "this click opens an in-page modal" without branching in the caller.

## How it works

- Immediately after calling `action()`, race two things: (1) a `Page.frameStartedNavigating` CDP listener that returns true only for real navigations (not `sameDocument` / `historySameDocument` / `historyDifferentDocument`), with a short "did navigation start in the next ~100ms" deadline; (2) the action itself awaiting completion.
- If a navigation started, `await page.waitForNavigation()` with an abort-signal-respecting timeout scaled by the currently emulated network condition.
- Then install a `MutationObserver` on `document.body` inside the page with `childList: true, subtree: true, attributes: true`. Set a debounce timer that resolves the wait after N ms of silence (e.g. 100ms); the observer's callback restarts the timer on each mutation.
- Race the observer resolve against a hard upper bound (e.g. 3s). Whichever wins, disconnect the observer.
- Wrap CPU- and network-based timeouts in multipliers derived from the active Chrome network emulation preset (Slow 3G → 10x) so slow-network tests don't flake.

## Example

```ts
async waitForEventsAfterAction(action: () => Promise<unknown>) {
  const navFinished = this.waitForNavigationStarted().then(started =>
    started ? this.#page.waitForNavigation({timeout: this.#navigationTimeout, signal: this.#abortController.signal}) : undefined
  ).catch(e => logger(e));

  try { await action(); } catch (e) { this.#abortController.abort(); throw e; }

  try {
    await navFinished;
    await this.waitForStableDom();
  } finally { this.#abortController.abort(); }
}

async waitForStableDom() {
  const observer = await this.#page.evaluateHandle(quietMs => {
    let timer;
    const r = Promise.withResolvers<void>();
    const o = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => { r.resolve(); o.disconnect(); }, quietMs);
    });
    o.observe(document.body, {childList:true, subtree:true, attributes:true});
    timer = setTimeout(() => r.resolve(), quietMs); // in case DOM is already quiet
    return {resolver: r, observer: o};
  }, this.#stableDomFor);
  return Promise.race([observer.evaluate(o => o.resolver.promise), this.timeout(this.#stableDomTimeout).then(()=>{throw new Error('Timeout')})]);
}
```

## Gotchas

- Puppeteer has no "navigation *about to* start" API, so you use the CDP event `Page.frameStartedNavigating` and filter out the three same-document navigation types. Don't just listen for `framenavigated` — that fires too late to decide whether to also wait for navigation.
- Always disconnect the MutationObserver on abort — it lives in the page and will keep firing (cheap but wasteful) until the page is gone.
- `setTimeout(resolve, quietMs)` must be started inside the observer callback *and* immediately on install, because a page that is already quiet never invokes the observer.
- Scaling timeouts by network preset isn't optional for Slow 3G / Slow 4G — the absolute values that work on Fast 4G will miss by 5-10x.
- Don't `await action()` before installing the observer if the action might resolve synchronously while the DOM churns — install the observer first, then run the action.
