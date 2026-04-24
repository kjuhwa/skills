---
name: fastmcp-stdio-http-dual-transport
description: Single MCP server entry point that supports both STDIO (default) and Streamable HTTP / SSE transports via a --http flag, using FastMCP + Starlette + uvicorn, with localhost-binding-by-default and a warning banner on non-localhost binds.
category: mcp
version: 1.0.0
tags: [mcp, fastmcp, sse, streamable-http, stdio, uvicorn, starlette, python]
source_type: extracted-from-git
source_url: https://github.com/microsoft/markitdown.git
source_ref: main
source_commit: 604bba13da2f43b756b49122cb65bdedb85b1dff
source_project: markitdown
source_path: packages/markitdown-mcp/src/markitdown_mcp/__main__.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
version_origin: extracted
---

# FastMCP server with STDIO + Streamable HTTP/SSE dual transport

Ship one MCP server binary that runs under STDIO by default (what Claude Desktop & most MCP clients expect) and switches to a local Streamable HTTP + SSE listener with `--http`. Useful when you want the same server to be reachable via inspector tools, local dockerized sandboxes, and STDIO-launched Claude sessions — without maintaining two codebases.

## The shape

```python
from mcp.server.fastmcp import FastMCP
from mcp.server.sse import SseServerTransport
from mcp.server.streamable_http_manager import StreamableHTTPSessionManager
from starlette.applications import Starlette
from starlette.routing import Route, Mount
from starlette.requests import Request
from starlette.types import Scope, Receive, Send
import contextlib
from collections.abc import AsyncIterator
import uvicorn

mcp = FastMCP("my-server")

@mcp.tool()
async def do_thing(uri: str) -> str:
    """Example MCP tool."""
    return f"processed {uri}"

def _starlette_app(mcp_server, *, debug=False) -> Starlette:
    sse = SseServerTransport("/messages/")
    session_manager = StreamableHTTPSessionManager(
        app=mcp_server, event_store=None, json_response=True, stateless=True,
    )

    async def handle_sse(request: Request) -> None:
        async with sse.connect_sse(request.scope, request.receive, request._send) as (r, w):
            await mcp_server.run(r, w, mcp_server.create_initialization_options())

    async def handle_http(scope: Scope, receive: Receive, send: Send) -> None:
        await session_manager.handle_request(scope, receive, send)

    @contextlib.asynccontextmanager
    async def lifespan(app: Starlette) -> AsyncIterator[None]:
        async with session_manager.run():
            yield

    return Starlette(
        debug=debug,
        routes=[
            Route("/sse", endpoint=handle_sse),
            Mount("/mcp", app=handle_http),
            Mount("/messages/", app=sse.handle_post_message),
        ],
        lifespan=lifespan,
    )

def main():
    import argparse, sys
    ap = argparse.ArgumentParser()
    ap.add_argument("--http", action="store_true",
                    help="Run on Streamable HTTP + SSE instead of STDIO")
    ap.add_argument("--host", default=None, help="(HTTP mode) bind host (default: 127.0.0.1)")
    ap.add_argument("--port", type=int, default=None, help="(HTTP mode) port (default: 3001)")
    args = ap.parse_args()

    if not args.http and (args.host or args.port):
        ap.error("--host/--port only valid with --http")

    if args.http:
        host = args.host or "127.0.0.1"
        if args.host and args.host not in ("127.0.0.1", "localhost"):
            # Loud warning — non-localhost bind is a footgun.
            print(
                "\nWARNING: binding to non-localhost interface "
                f"({host}). The server has NO authentication and runs with your privileges. "
                "Any reachable process/user can invoke tools. Only proceed if you understand "
                "the security implications.\n",
                file=sys.stderr,
            )
        uvicorn.run(_starlette_app(mcp._mcp_server, debug=True),
                    host=host, port=args.port or 3001)
    else:
        mcp.run()   # STDIO

if __name__ == "__main__":
    main()
```

## Why the three routes on the HTTP side

| Route | Transport | When to use |
|---|---|---|
| `GET /sse` | SSE (legacy MCP) | Older clients that speak MCP-over-SSE only. |
| `POST /mcp` | Streamable HTTP (newer MCP) | Modern clients; stateless; works through HTTP proxies and load balancers. |
| `POST /messages/` | SSE outbound channel | Companion to `/sse`; clients POST tool results back here. |

Mounting all three on one Starlette app gives clients free choice without you running two processes.

## Security defaults (important)

- **Default bind: `127.0.0.1`.** The MCP server has **no authentication** and runs with the launching user's privileges. Any process on the local machine that can reach the port can invoke every tool.
- **Non-localhost bind is an explicit user choice** — `--host 0.0.0.0` requires the operator to see the WARNING banner on stderr. Do not silently accept it.
- **STDIO is preferred for Claude Desktop** — it inherits the client's launch permissions and isn't network-exposed at all.

If you genuinely need remote access, run the server inside a container and require auth at a reverse proxy (nginx + mTLS, or a VPN). Don't build auth into the MCP server itself.

## Claude Desktop config

STDIO is the easy path:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "my-mcp",
      "args": []
    }
  }
}
```

With Docker (for sandboxed local runs):

```json
{
  "mcpServers": {
    "my-server": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "my-mcp:latest"]
    }
  }
}
```

The `-i` keeps STDIN connected; `--rm` cleans the container when the session ends.

## Debugging with MCP Inspector

`npx @modelcontextprotocol/inspector` gives you a UI to list and invoke tools. For STDIO, set command to your server binary. For HTTP, point it at `http://127.0.0.1:3001/mcp` (Streamable HTTP) or `http://127.0.0.1:3001/sse` (SSE).

## Anti-patterns

- **Defaulting to `0.0.0.0`.** Exposes the unauthenticated tool surface to every machine on the LAN.
- **One server per transport.** Doubles maintenance; two binaries to ship, test, and document.
- **Silencing the non-localhost warning.** Users forget; the banner is their last line of defense.
- **Running the HTTP variant as root.** The server executes tools with its own privileges; privileged service = privileged tool surface.

## Variations

- **Stateful sessions.** Set `StreamableHTTPSessionManager(stateless=False, event_store=...)` when you need session resumption across reconnects.
- **CORS / auth reverse proxy.** Put nginx/Caddy in front; MCP server stays bound to localhost, proxy terminates TLS + auth.
- **Environment toggles for plugins.** Plugins-on-by-default often surprises users; gate behind `MYMCP_ENABLE_PLUGINS=true` and read the env inside the tool function.
