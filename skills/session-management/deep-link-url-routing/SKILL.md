---
name: deep-link-url-routing
description: Custom URL scheme (craftagents://) routes directly into the app: allSessions, specific session, settings, new-chat actions — maps each URL path segment to a renderer-side navigation intent.
category: session-management
version: 1.0.0
version_origin: extracted
tags: [deep-link, url-scheme, electron, routing]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: apps/electron/src/main/deep-link.ts
imported_at: 2026-04-18T00:00:00Z
---

# Deep-link URL routing into an Electron app

## When to use
- External apps / emails / QR codes need to open a specific view inside your app.
- You want Slack-style shareable links ("open session X in the app") that survive app being closed.
- Multiple app instances need their own scheme (see `multi-instance-electron-dev`).

## How it works
1. Register scheme early in main process: `app.setAsDefaultProtocolClient(scheme)`.
2. Windows/Linux pass the URL as `process.argv`; macOS fires `app.on('open-url')`.
3. Store as `pendingDeepLink` if the app isn't ready yet (cold start race), apply on `app.whenReady()`.
4. Parse URL into a typed intent:
   - `craftagents://allSessions` -> navigate to inbox
   - `craftagents://allSessions/session/:id` -> open session
   - `craftagents://settings` -> settings pane
   - `craftagents://sources/source/:slug` -> source detail
   - `craftagents://action/new-chat` -> create + open a new session
5. Send via RPC to renderer: `window.webContents.send('deep-link', intent)`.
6. Renderer dispatches to its router (`useEffect(() => subscribe('deep-link', navigate), [])`).
7. Deep-link scheme is env-overridable (`CRAFT_DEEPLINK_SCHEME`) so you can run multiple isolated dev instances.

## Example
```ts
// main/deep-link.ts
export function handleDeepLink(url: string, windowManager: WindowManager) {
  try {
    const u = new URL(url);
    const path = u.pathname.split('/').filter(Boolean);
    const intent = parseIntent(u.hostname, path);
    const win = windowManager.focusOrCreateMainWindow();
    win.webContents.send('deep-link', intent);
  } catch { /* ignore malformed */ }
}

function parseIntent(host: string, path: string[]) {
  if (host === 'allSessions' && path[0] === 'session') return { type: 'open-session', id: path[1] };
  if (host === 'settings') return { type: 'open-settings' };
  if (host === 'action' && path[0] === 'new-chat') return { type: 'new-chat' };
  return { type: 'unknown' };
}
```

```ts
// In main/index.ts
if (process.platform === 'darwin') app.on('open-url', (e, url) => { e.preventDefault(); handleDeepLink(url); });
else app.on('second-instance', (_, argv) => {
  const url = argv.find(a => a.startsWith(`${scheme}://`));
  if (url) handleDeepLink(url);
});
```

## Gotchas
- Register BEFORE `app.whenReady()` on macOS or cold-start launches lose the URL.
- Windows needs `requestSingleInstanceLock()` + `second-instance` event; otherwise a second `craftagents://` click spawns a new app instead of focusing the existing one.
- Validate URL rigorously - anyone can inject `craftagents://action/rm-rf`. Use a whitelist of actions.
- Parse with `new URL()`, not regex - URL escaping / internationalized paths bite.
- Keep intents stable: don't rename `allSessions` after shipping because old links will 404.
