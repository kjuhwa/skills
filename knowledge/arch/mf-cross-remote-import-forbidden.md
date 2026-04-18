---
version: 0.1.0-draft
tags: [arch, cross, remote, import, forbidden]
name: mf-cross-remote-import-forbidden
description: In a Module Federation monorepo with per-remote webpack aliases, remotes must not import from sibling remotes directly — share code through `shared/` or through MF exposes.
category: arch
confidence: high
source:
  kind: project
  ref: lucida-ui@4b922a9043
---

# Fact

Each remote in a MF monorepo typically defines `@/` → `remotes/<self>/src/`. If remote B imports a file from remote A using a relative path or `@/`, the build in B resolves `@/` to B's own src, not A's — silently picking the wrong file (or failing). Direct sibling imports also defeat the independent-build/deploy property of MF.

Two legitimate sharing surfaces:

1. **`shared/` workspace** — code that is stateless, versioned with the monorepo, imported via a scoped path (`@<scope>/shared/...`). Use for utilities, API clients, types, pure components.
2. **MF exposes** — stateful or heavy components that must stay owned by one remote. Consumer imports via a `shared/remote-components/imports/<producer>/<Component>` wrapper (see skill: `module-federation-expose-react-component`).

# Why

Per-remote `@/` aliases plus independent webpack builds mean cross-remote relative imports produce incorrect resolution or duplicated bundles. Routing everything through `shared/` or MF keeps remote boundaries enforceable and lets each remote ship independently.

# How to apply

- Reviewing a PR: flag any `import ... from '<scope>/remotes/<other>/...'` or relative `../../remotes/...` path.
- Writing new code that would be useful to multiple remotes: prefer placing it in `shared/` if it is pure/portable.
- If the code has heavy deps or per-remote state it should not leave its home remote: create an MF expose and a `shared/remote-components/imports/...` wrapper.

# Counter / Caveats

- TypeScript type-only imports may appear to work across remotes because tsc resolves paths — they still break the runtime build and should be routed via `shared/types`.
- The `shared/` workspace itself must not import back from any remote; that would invert the dependency graph.
