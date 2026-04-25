---
version: 0.1.0-draft
name: deep-link-scheme-routes
summary: craftagents:// URL routes — allSessions, allSessions/session/:id, settings, sources/source/:slug, action/new-chat — with an env override CRAFT_DEEPLINK_SCHEME for multi-instance dev.
category: reference
tags: [deep-link, url-scheme, routing]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: README.md
imported_at: 2026-04-18T00:00:00Z
---

# Deep-link routes

Craft Agents registers a custom URL scheme (default: `craftagents://`) that external apps / emails / QR codes can use to navigate into a specific view.

### Routes
| URL | Destination |
|---|---|
| `craftagents://allSessions` | Inbox / all-sessions view |
| `craftagents://allSessions/session/<id>` | Open specific session |
| `craftagents://settings` | Settings pane |
| `craftagents://sources/source/<slug>` | Source detail |
| `craftagents://action/new-chat` | Create + open a new session |

### Multi-instance dev
The scheme is overridable via env `CRAFT_DEEPLINK_SCHEME`:
- Default: `craftagents`
- Instance 1: `craftagents1://` (auto-derived when folder name ends in `-1`)
- Instance 2: `craftagents2://`
This lets developers run multiple local instances side-by-side; each registers its own scheme with the OS.

### OS integration
- macOS: `app.on('open-url', ...)` fires on URL click.
- Windows: URL comes as `process.argv[-1]`; requires `app.requestSingleInstanceLock()` + `second-instance` event to focus existing app.
- Linux: same argv pattern; depends on desktop environment associating the scheme.

### Cold-start race
If the app isn't ready when the URL fires (cold start), the handler stashes `pendingDeepLink` and applies it on `app.whenReady()`. Implemented in `apps/electron/src/main/deep-link.ts`.

### Security
URL parsing uses `new URL()`; router validates the hostname + path segments against a fixed whitelist. Anything unrecognized is ignored silently. DON'T dispatch raw action strings — always a discriminated-union `intent` object.

### Extension pattern
To add a new route:
1. Parse in `deep-link.ts#parseIntent`.
2. Add a new `intent.type` to the discriminated union.
3. Handle in renderer's deep-link subscriber.
4. Document in README under "Deep Linking".

### Reference
- `apps/electron/src/main/deep-link.ts`
- README.md "Deep Linking" section.
