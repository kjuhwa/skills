---
name: detached-update-check-with-local-cache
description: Check for package updates in a detached child subprocess with a 24h local cache so startup stays fast, notification is fresh, and network failure never blocks the user.
category: reliability
version: 1.0.0
version_origin: extracted
tags: [cli, update-check, caching, npm, ux]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/utils/check-for-updates.ts
imported_at: 2026-04-18T00:00:00Z
---

# Detached Update Check with Local Cache

## When to use

- You ship a CLI on npm (or similar) and want users to see "Update available" without a startup latency penalty or offline fragility.
- Current process must read a recent cached version *synchronously-ish* (a single `fs.readFile`), while the actual HTTP check happens in the background for next time.

## How it works

- On startup: read `~/.cache/<app>/latest.json` if present. If `cachedVersion > currentVersion`, print the upgrade notice now. This is the only user-visible effect.
- Check the file `mtime`; if younger than 24h, return and skip the refresh.
- Otherwise, touch/create the cache file's mtime immediately (so concurrent processes don't all race to refresh), then spawn a detached child (`node check-latest-version.js <cachePath>`) with `stdio: 'ignore'` and `child.unref()`. The child fetches `https://registry.npmjs.org/<pkg>/latest`, writes `{version}` to the cache, and exits. The parent returns immediately.
- Respect a `NO_UPDATE_CHECK` env var as a hard opt-out for CI / corp networks.
- Use an `isChecking` module-level flag so repeated calls within a single process don't stack.

## Example

```ts
export async function checkForUpdates(message: string) {
  if (isChecking || process.env.MYAPP_NO_UPDATE_CHECKS) return;
  isChecking = true;
  const cachePath = path.join(os.homedir(), '.cache', 'myapp', 'latest.json');
  let cachedVersion, stats;
  try { stats = await fs.stat(cachePath); cachedVersion = JSON.parse(await fs.readFile(cachePath, 'utf8')).version; } catch {}
  if (cachedVersion && semver.lt(CURRENT_VERSION, cachedVersion)) {
    console.warn(`\nUpdate available: ${CURRENT_VERSION} -> ${cachedVersion}\n${message}\n`);
  }
  if (stats && Date.now() - stats.mtimeMs < 24 * 60 * 60 * 1000) return;
  try { // pre-touch to claim the refresh slot
    await fs.mkdir(path.dirname(cachePath), {recursive: true});
    if (stats) await fs.utimes(cachePath, new Date(), new Date());
    else await fs.writeFile(cachePath, JSON.stringify({version: CURRENT_VERSION}));
  } catch {}
  const child = child_process.spawn(process.execPath, [CHECK_SCRIPT, cachePath], {detached: true, stdio: 'ignore'});
  child.unref();
}

// check-latest-version.js (background worker)
const res = await fetch('https://registry.npmjs.org/mypkg/latest');
if (res.ok) {
  const {version} = await res.json();
  await fs.writeFile(cachePath, JSON.stringify({version}));
}
```

## Gotchas

- Pre-touch the mtime *before* spawning the subprocess. Otherwise 10 parallel CLI invocations all spawn and race on the same file.
- The subprocess must swallow all errors silently — network flakiness must never surface to the parent.
- Cache is `os.homedir()/.cache` on Linux/macOS; on Windows use `%LOCALAPPDATA%`. Don't put update state under `Application Support` or `AppData\Roaming` — it's not per-machine user transient state.
- Don't gate tool functionality on the update check. It must be best-effort; the notification is the only allowed effect.
- When showing the notice, link the user to an exact upgrade command (`npm i -g mypkg@latest`) — otherwise they have to google.
