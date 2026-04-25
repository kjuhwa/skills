---
version: 0.1.0-draft
name: mcp-localhost-bind-default-warn-on-expose
summary: MCP HTTP servers should default to 127.0.0.1, fail fast if --host/--port are used without --http, and emit a loud stderr warning when the operator explicitly binds to a non-localhost interface.
category: security
confidence: medium
tags: [mcp, security, network-binding, unauthenticated, defaults]
source_type: extracted-from-git
source_url: https://github.com/microsoft/markitdown.git
source_ref: main
source_commit: 604bba13da2f43b756b49122cb65bdedb85b1dff
source_project: markitdown
source_path: packages/markitdown-mcp/src/markitdown_mcp/__main__.py
imported_at: 2026-04-18T00:00:00Z
---

# MCP server bind defaults: localhost, with a loud warning if you deviate

A raw MCP server is **unauthenticated** and runs with the launching user's privileges. Any process or user that can reach the bind address can invoke every registered tool — which often means "read any file this user can read" or "call any internet endpoint." Treat a publicly-bound MCP server the same way you'd treat `nc -l -p 80 -e /bin/bash`.

## The three-rule default

1. **Default bind: `127.0.0.1`.** STDIO mode has no network exposure at all — prefer it when the client (Claude Desktop, inspector) launches the server as a subprocess.
2. **`--host`/`--port` only valid with `--http`.** Refuse at argparse time if the operator passes them without explicitly opting into HTTP — prevents silent "I thought `--port 3001` worked."
3. **Non-localhost bind triggers a loud warning.** Emit a multi-line banner on stderr whenever the operator passes `--host 0.0.0.0` or any non-`127.0.0.1`/`localhost` host:

   ```
   WARNING: The server is being bound to a non-localhost interface (0.0.0.0).
   This exposes the server to other machines on the network or Internet.
   The server has NO authentication and runs with your user's privileges.
   Any process or user that can reach this interface can read files and
   fetch network resources accessible to this user.
   Only proceed if you understand the security implications.
   ```

## Rationale (markitdown's stance verbatim)

> The server does not support authentication, and runs with the privileges of the user running it. For this reason, when running in SSE or Streamable HTTP mode, the server binds by default to `localhost`. Even still, it is important to recognize that the server can be accessed by any process or users on the same local machine... If you require additional security, consider running the server in a sandboxed environment, such as a virtual machine or container, and ensure that the user permissions are properly configured to limit access to sensitive files and network segments. Above all, DO NOT bind the server to other interfaces (non-localhost) unless you understand the security implications of doing so.

## When you actually do need remote access

- **VPN** — run the MCP server bound to localhost on a jump host, reach it via VPN (Tailscale, WireGuard). No direct internet exposure.
- **TLS reverse proxy with auth** — nginx/Caddy terminates TLS, authenticates the request, proxies to `127.0.0.1:3001`. MCP server still binds local.
- **Dockerized** — container network namespace isolates the bind; map via `-p 127.0.0.1:3001:3001` on the host.

Do **not** build auth into the MCP server itself — it's not the right layer, and it'll drift behind best practices.

## Recommended argparse shape

```python
parser.add_argument("--http", action="store_true")
parser.add_argument("--host", default=None)
parser.add_argument("--port", type=int, default=None)
args = parser.parse_args()

# Refuse host/port without --http
if not args.http and (args.host or args.port):
    parser.error("--host/--port only valid with --http")

# Default to loopback; warn on deviation
host = args.host or "127.0.0.1"
if args.host and host not in ("127.0.0.1", "localhost"):
    sys.stderr.write(WARNING_BANNER)
```

## Related

- `fastmcp-stdio-http-dual-transport` — the paired skill showing the full server shape with both transports.
- Any skill on "unauthenticated localhost service" — same playbook applies to Jupyter, Prometheus node_exporter, and redis in dev setups.
