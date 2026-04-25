---
version: 0.1.0-draft
name: chrome-extension-based-web-automation-via-cdp
summary: Browser automation via Chrome extension + CDP bridge that preserves the user's real login state — Selenium-free, Playwright-free, survives autofill and closed shadow DOM.
category: automation
tags: [browser-automation, chrome-extension, cdp, web-scraping, selenium-alternative]
source_type: extracted-from-git
source_url: https://github.com/lsdefine/GenericAgent.git
source_ref: main
source_commit: ec34b7e1c0f11fbb9709680ccfe313187a1b942b
source_project: GenericAgent
source_path: memory/tmwebdriver_sop.md, TMWebDriver.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
---

# Chrome-extension-based web automation via CDP

An alternative architecture to Selenium/Playwright for scripted browser automation, where the **user's real, logged-in Chrome** is the target. Uses a custom Chrome extension (with `debugger` permission) to bridge between an external driver process and the Chrome DevTools Protocol (CDP).

## Why another browser automation approach

Selenium and Playwright both spin up a **fresh** browser instance with a clean profile. That means:

- User has to re-login to every site each run (or copy cookies manually).
- 2FA-gated sites are painful; sites with device fingerprinting may flag the bot.
- Extensions, user scripts, and cached credentials don't carry over.

Stand-alone CDP against a user-launched Chrome *sort of* works, but browsers in normal-use mode refuse remote debugging by default. Launching Chrome with `--remote-debugging-port` for automation means you can't also use Chrome normally in that profile.

The extension-based approach solves this: install a small extension once, and any tab becomes scriptable without flags. The extension runs with `debugger` permission and exposes a WebSocket (e.g., `127.0.0.1:18766`) for the driver process.

## Architectural components

```
[Python driver] ←WebSocket→ [Chrome extension background.js] ←chrome.debugger→ [CDP]
                                                            ←content-script→ [DOM]
```

Two command families travel over the same bus:

- **DOM commands** (`web_scan`, `web_execute_js`): routed to content scripts for things like reading innerText and running JS.
- **CDP commands** (via extension's `chrome.debugger.sendCommand`): for things JS can't do — file upload, real mouse events with `isTrusted=true`, cross-origin iframe introspection, full-page screenshots.

## Command interface

Commands are JSON dispatched through a single `web_execute_js` entry point:

```js
// Direct JS
web_execute_js script="document.title"

// CDP command (as JSON string)
web_execute_js script='{"cmd":"cdp","tabId":N,"method":"Page.captureScreenshot","params":{}}'

// Extension management
web_execute_js script='{"cmd":"management","method":"list"}'

// Batch (amortizes WebSocket round trips)
web_execute_js script='{"cmd":"batch","commands":[...]}'
```

Batch mode supports `$N.path` references to earlier results — e.g., `"nodeId":"$2.root.nodeId"` uses the third command's `root.nodeId`. CDP sessions are lazily attached and reused within the batch.

## Why batch matters

File upload as a single batch:

```
DOM.getDocument(depth=1)
  → querySelector('input[type=file]')
  → DOM.setFileInputFiles({files: [...]})
```

Doing this as three round-trips leaves a window where the framework (React etc.) may unmount the transient `<input>`. One batch round-trip keeps the window tight. The driver can't get preempted between subcommands — the extension executes them sequentially while holding the CDP session.

## Where this architecture shines

- **File upload.** JavaScript can't programmatically fill an `<input type="file">`. CDP's `DOM.setFileInputFiles` can, via `debugger` permission.
- **`isTrusted=true` clicks.** Script-synthesized clicks have `isTrusted=false` and are rejected by anti-bot guards. CDP `Input.dispatchMouseEvent` produces trusted events.
- **Cross-origin iframes** (e.g., third-party payment widgets). `Page.getFrameTree` + `Page.createIsolatedWorld` + `Runtime.evaluate` works even where `contentDocument` is null.
- **Closed Shadow DOM.** `DOM.getDocument({depth: -1, pierce: true})` pierces closed shadow boundaries — JS cannot.
- **Autofill release.** Chrome only releases real autofilled values on a *trusted* click in a *foreground* tab. `Page.bringToFront` + CDP `mousePressed` on any field releases the whole form's protected values.
- **Stealth screenshots.** `Page.captureScreenshot` works on background tabs without stealing focus.

## Pitfalls worth knowing

### `web_execute_js` and `await`

If the JS uses `await`, the user MUST write `return` explicitly:

```js
// WRONG — returns null
const r = await fetch('/api');

// RIGHT
return await fetch('/api').then(r => r.json());
```

The driver wraps the script in an async function; without `return`, you get the async function's implicit `undefined`.

### Three-event mouse sequence

Proper mouse click sequence in CDP:

```
mouseMoved → (pause 50-100ms) → mousePressed → (pause) → mouseReleased
```

Skipping `mouseMoved` breaks components that depend on hover (Material-UI Tooltip, Ant Design Dropdown). The exception is autofill release, which only needs `mousePressed`.

### Transform/zoom corrections

Pages using `transform: scale()` or `zoom` need coordinate correction:

```js
const scale = window.visualViewport?.scale ?? 1;
const zoom = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
const realX = x * zoom;
const realY = y * zoom;
```

### iframe click composition

For clicks inside an iframe: `finalX = iframeRect.x + elementRect.x` (same for Y). Passing the element-relative coordinate straight to CDP produces an off-by-iframe-offset miss.

### `nodeId` is not stable

DOM-mutating pages invalidate `nodeId` between turns. Prefer `backendNodeId` (stable across mutations) or re-`getDocument` if you need a fresh tree.

### Extension updates invalidate existing tabs

Updating the extension doesn't reload content scripts in already-open tabs. The user (or driver) must refresh each tab after an extension upgrade.

### Sticky `sender.tab.id`

Default CDP target is the sender tab. Cross-tab operations need explicit `tabId` — either hardcoded or discovered via `{cmd:"tabs"}` in the same batch.

## Connection-dead troubleshooting order

When `web_scan` fails:

1. **Extension not installed?** Check `chrome://extensions` for the bridge extension — missing → install.
2. **Browser not running?** Check process list (`tasklist` / `ps`). Launch Chrome if needed. Make sure a real URL is open (extensions do NOT load on `about:blank` / `chrome://newtab`).
3. **WS backend down?** `socket.connect_ex(('127.0.0.1', 18766))` should return 0. If not, restart the driver process (`TMWebDriver()` constructor).

## Unique identifier (TID) convention

First launch generates a per-install TID into `config.js` (gitignored). The extension manifest references it; the driver uses it to route between multiple installs on the same machine. The TID also enables a DOM-based fallback: the driver inserts a TID-marked element and listens via `MutationObserver` if WebSocket is unreliable.

## What to copy, what to reconsider

Copy:
- The batch command format with `$N.path` backreferences — big latency win.
- The layered command routing (JS / CDP / management) behind one external call.
- The troubleshooting order — extension → browser → WebSocket.

Reconsider:
- Rolling your own extension is maintenance overhead. For ad-hoc scraping with a throwaway profile, Playwright is still simpler.
- `chrome.debugger` permission triggers a persistent "XYZ started debugging this browser" banner — fine for a dev tool, bad for anything user-facing.
- Content-script injection doesn't reach iframes from third-party origins — budget for CDP `createIsolatedWorld` when those matter.

---

Reference extracted from GenericAgent's `tmwebdriver_sop.md` and `TMWebDriver.py`. Concepts generalized; implementation details are examples. See `assets/tmwd_cdp_bridge/` in the original repo for the extension source.
