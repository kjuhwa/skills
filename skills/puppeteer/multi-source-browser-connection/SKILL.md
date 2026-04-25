---
name: multi-source-browser-connection
description: Build one `ensureBrowserConnected` entry point that accepts any of browserURL, wsEndpoint, release channel, or userDataDir and resolves the right Puppeteer connect options, so callers never branch on "how do I connect".
category: puppeteer
version: 1.0.0
version_origin: extracted
tags: [puppeteer, cdp, browser-connection, configuration, api-design]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/browser.ts
imported_at: 2026-04-18T00:00:00Z
---

# Multi-Source Browser Connection

## When to use

- Your tool supports several ways users can bring a Chrome to the party: HTTP debug endpoint (`--remote-debugging-port`), WS endpoint, existing user-data-dir, or "just start Chrome with release channel X".
- You don't want each caller to know the ordering rules and fallbacks.

## How it works

- Define one exported `ensureBrowserConnected(options)` that takes the full union: `{browserURL?, wsEndpoint?, wsHeaders?, channel?, userDataDir?, devtools, enableExtensions?}`.
- Resolve in strict precedence: `wsEndpoint` wins, then `browserURL`, then `userDataDir` (read `DevToolsActivePort` from it to construct `ws://127.0.0.1:${port}${path}`), then `channel`. Throw a descriptive error if none is provided.
- Cache the connected `Browser` at module scope; re-entering `ensureBrowserConnected` while `browser?.connected` is truthy reuses it. This makes the function idempotent.
- Wrap `puppeteer.connect` in a try/catch that produces a user-facing message that tells the user what to do next ("Check if Chrome is running and remote debugging is enabled at chrome://inspect/#remote-debugging").
- Provide a matching `ensureBrowserLaunched(options)` for the launch path with its own option shape (userDataDir, headless, isolated, viewport, chromeArgs), same caching rule.

## Example

```ts
export async function ensureBrowserConnected(options) {
  if (browser?.connected) return browser;
  const connectOptions = {targetFilter: makeTargetFilter(options.enableExtensions), defaultViewport: null};
  if (options.wsEndpoint) {
    connectOptions.browserWSEndpoint = options.wsEndpoint;
    if (options.wsHeaders) connectOptions.headers = options.wsHeaders;
  } else if (options.browserURL) {
    connectOptions.browserURL = options.browserURL;
  } else if (options.userDataDir) {
    const {port, path} = await readDevToolsActivePort(options.userDataDir);
    connectOptions.browserWSEndpoint = `ws://127.0.0.1:${port}${path}`;
  } else if (options.channel) {
    connectOptions.channel = options.channel === 'stable' ? 'chrome' : `chrome-${options.channel}`;
  } else {
    throw new Error('Either browserURL, wsEndpoint, channel or userDataDir must be provided');
  }
  try { browser = await puppeteer.connect(connectOptions); }
  catch (err) { throw new Error('Could not connect to Chrome. ...', {cause: err}); }
  return browser;
}
```

## Gotchas

- `DevToolsActivePort` file format is two lines: port number, then the path (e.g. `/devtools/browser/<uuid>`). Handle both missing file and invalid content. The port can be out of 1..65535 if the file is corrupt.
- `targetFilter` must exclude `chrome://` and `chrome-untrusted://` schemes so your tool doesn't try to operate on the DevTools UI itself. Make extensions opt-in so the filter stays tight by default.
- Cache is process-scoped; if you fork workers, each gets its own browser handle. Don't try to share a `Browser` across processes.
- On Windows, if `channel` is requested and Chrome isn't installed, Puppeteer's error is opaque — wrap with context that tells the user to install Chrome or pass `--executablePath`.
