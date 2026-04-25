---
version: 0.1.0-draft
name: dockerfile-server-design-choices
summary: Why Dockerfile.server uses oven/bun:1.3-slim, creates a non-root craftagents user, chmod's with find -not -perm, and ships the CJS-bundled MCP helpers — each choice solved a real production issue.
category: devops
tags: [docker, bun, non-root, image-optimization]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: Dockerfile.server
imported_at: 2026-04-18T00:00:00Z
---

# Dockerfile.server design choices

Annotated rationale for each non-obvious line in `Dockerfile.server`:

### `FROM oven/bun:1.3-slim`
- Pin the Bun minor version for reproducibility.
- `-slim` over full: smaller image, no unnecessary Node/Python/build-essential.

### `apt-get install -y ca-certificates git ripgrep`
- `ca-certificates`: for TLS to Anthropic/GitHub/etc.
- `git`: required by the Claude Agent SDK for certain workspace introspection tools.
- `ripgrep`: the SDK ships a `rg` per-platform, but some environments prefer the distro one; having both avoids `ENOENT rg` errors when the SDK's own vendor is filtered out by our build.

### `groupadd -r craftagents; useradd -r -g craftagents -m -d /home/craftagents`
Create a dedicated non-root user. Claude Code SDK refuses to run as root (nesting/safety guard), so even if operators forget `--user`, the default USER is already safe.

### Two-pass manifest copy then `bun install --frozen-lockfile`
Classic Docker caching trick: copying just `package.json` + `bun.lock` before source lets the install layer cache across source changes. Saves minutes on every code-only rebuild.

### Build MCP helpers in the image
```
RUN bun build packages/session-mcp-server/src/index.ts --outfile=...
    --target=node --format=cjs
```
These CJS bundles are required at runtime by `runtime-resolver.ts`. Building in-image avoids shipping the full dev toolchain.

### Build web UI assets (`bunx vite build --config apps/webui/vite.config.ts`)
If the server is configured with `CRAFT_WEBUI_DIR=/app/apps/webui/dist`, it serves a browser UI on the RPC port.

### Pre-create `/home/craftagents/.craft-agent`
Docker named volumes inherit dir permissions from existing target. If the mount point doesn't exist at image build time, the volume comes up owned by root regardless of the `--user` flag.

### `find /app -not -perm -o=r -exec chmod o+r {} +`
The clever optimization — touch only files that lack the read bit. Regular `chmod -R` on `/app` (huge `node_modules`) takes minutes and bloats the image layer. The `find` variant writes only deltas. See the `docker-find-chmod-fast-readability` skill.

### `chmod -R 777 /home/craftagents`
Deliberately relaxed on the home dir because `--user $(id -u):$(id -g)` substitution at runtime needs write access to `.craft-agent/`. Not a security issue: that dir is user-controlled data, not executable code.

### `USER craftagents`
Final user. Paired with README advice: `docker run --user $(id -u):$(id -g) -e HOME=/home/craftagents` — hostUID writes to volumes with host ownership, avoiding permission-mismatch hell.

### ENV defaults
`CRAFT_RPC_HOST=0.0.0.0`, `CRAFT_RPC_PORT=9100`, `CRAFT_BUNDLED_ASSETS_ROOT=/app/apps/electron` — container-sensible defaults that work with `docker run -p 9100:9100` out of the box.
