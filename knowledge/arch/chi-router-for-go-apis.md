---
name: chi-router-for-go-apis
summary: go-chi/chi is the router of choice for REST APIs with middleware groups, URL params, and nested routing — simpler than gin/echo while keeping idiomatic net/http compatibility.
category: arch
tags: [go, chi, router, middleware, api]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: server/internal/middleware/workspace.go
imported_at: 2026-04-18T00:00:00Z
---

Router choice for the Go backend: `github.com/go-chi/chi/v5`. Canonical usage:

```go
r := chi.NewRouter()
r.Use(middleware.RequestID, middleware.Recoverer)

r.Route("/api", func(r chi.Router) {
    r.Route("/auth", func(r chi.Router) {
        r.Post("/send-code",   handler.SendCode)
        r.Post("/verify-code", handler.VerifyCode)
    })

    r.Group(func(r chi.Router) {
        r.Use(auth.RequireAuth)
        r.Get("/me", handler.Me)

        r.Group(func(r chi.Router) {
            r.Use(workspacemid.RequireWorkspaceMember(queries))
            r.Get ("/issues",     handler.ListIssues)
            r.Post("/issues",     handler.CreateIssue)
            r.Patch("/issues/{id}", handler.UpdateIssue)  // chi.URLParam(r, "id")
        })
    })
})
```

## Why

chi stays close to `net/http` — handlers are `http.HandlerFunc`, middleware is `func(http.Handler) http.Handler`. No DSL, no framework lock-in, no runtime reflection for routing. Nested `Route`/`Group` plus middleware scoping give enough ergonomics without a framework's opinions.

URL params via `chi.URLParam(r, "id")` — slightly awkward vs a framework that injects params, but readable and explicit.

## Evidence

- `server/internal/middleware/workspace.go:6-8` — `"github.com/go-chi/chi/v5"` import.
- `server/internal/middleware/workspace.go:146-156` — `chi.URLParam` usage in `RequireWorkspaceMemberFromURL`.
