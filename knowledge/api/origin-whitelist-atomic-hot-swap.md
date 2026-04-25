---
version: 0.1.0-draft
name: origin-whitelist-atomic-hot-swap
summary: Store the WebSocket allowed-origins list in an atomic.Value so it can be hot-swapped without locking the request path, with env-based defaults for dev.
category: api
tags: [websocket, cors, origin, atomic, config]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: server/internal/realtime/hub.go
imported_at: 2026-04-18T00:00:00Z
---

WebSocket origin checks are called on every upgrade request. Hot-path performance and thread-safety both matter. Pattern:

```go
var allowedWSOrigins atomic.Value  // holds []string

func init() { allowedWSOrigins.Store(loadAllowedOrigins()) }

func loadAllowedOrigins() []string {
    raw := os.Getenv("ALLOWED_ORIGINS")
    if raw == "" { raw = os.Getenv("CORS_ALLOWED_ORIGINS") }
    if raw == "" { raw = os.Getenv("FRONTEND_ORIGIN") }
    if raw == "" {
        return []string{"http://localhost:3000", "http://localhost:5173", "http://localhost:5174"}
    }
    parts := strings.Split(raw, ",")
    origins := make([]string, 0, len(parts))
    for _, p := range parts {
        if o := strings.TrimSpace(p); o != "" { origins = append(origins, o) }
    }
    return origins
}

func SetAllowedOrigins(origins []string) { allowedWSOrigins.Store(origins) }

func checkOrigin(r *http.Request) bool {
    origin := r.Header.Get("Origin")
    if origin == "" { return true }
    for _, allowed := range allowedWSOrigins.Load().([]string) {
        if origin == allowed { return true }
    }
    return false
}
```

## Why

Atomic.Value is cheaper than a mutex for write-rarely-read-often config. Admin APIs can update the whitelist (add a new subdomain, remove a deprecated one) without server restart. Multiple fallback env vars accommodate existing deployments with different conventions.

Defaults for dev include common local ports (Next.js 3000, Vite 5173/5174) so new developers don't get CORS errors on first run.

## Evidence

- `server/internal/realtime/hub.go:34-85` — full pattern.
