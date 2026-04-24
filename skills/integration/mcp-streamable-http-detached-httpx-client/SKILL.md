---
name: mcp-streamable-http-detached-httpx-client
description: Inject a caller-owned httpx.AsyncClient into the official MCP streamable_http transport via httpx_client_factory, using a no-op async-context-manager so the transport never closes the underlying client on exit.
category: integration
version: 1.0.0
version_origin: extracted
tags: [mcp, streamable-http, httpx, sdk-shim]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/integrations/mcp_streamable_http_compat.py
imported_at: 2026-04-18T00:00:00Z
---

# MCP Streamable HTTP with a Detached httpx Client

## When to use
You want to share one `httpx.AsyncClient` (with custom auth, proxies, retries, connection pool) across many MCP server connections, but `mcp.client.streamable_http.streamablehttp_client` only accepts an `httpx_client_factory` callable that constructs a new client (and that the transport will close on exit). You need a shim that hands back the existing client without taking ownership of its lifecycle.

## How it works
- `_DetachExitAsyncClientCM` is a tiny `async with` context manager that yields the pre-built `httpx.AsyncClient` on `__aenter__` and does NOTHING on `__aexit__` — no close, no shutdown.
- `_httpx_factory_for_client(client)` returns the factory function the MCP SDK expects; the factory ignores the SDK's headers/timeout/auth args (they're already configured on the client) and returns the wrapper CM.
- The public `streamable_http_client` function passes the factory into the official transport, so application code can use one client across many MCP servers.

## Example
```python
class _DetachExitAsyncClientCM:
    __slots__ = ("_client",)
    def __init__(self, client: httpx.AsyncClient): self._client = client
    async def __aenter__(self):  return self._client
    async def __aexit__(self, *_): return None

def _httpx_factory_for_client(http_client):
    def _factory(headers=None, timeout=None, auth=None):
        del headers, timeout, auth          # already configured on the shared client
        return cast(httpx.AsyncClient, _DetachExitAsyncClientCM(http_client))
    return _factory

@asynccontextmanager
async def streamable_http_client(url, *, http_client, headers=None,
                                 timeout=30.0, sse_read_timeout=300.0,
                                 terminate_on_close=True):
    async with _streamablehttp_client(
        url, headers=headers or {}, timeout=timeout,
        sse_read_timeout=sse_read_timeout, terminate_on_close=terminate_on_close,
        httpx_client_factory=_httpx_factory_for_client(http_client),
    ) as triple:
        yield triple
```

## Gotchas
- `cast(httpx.AsyncClient, _DetachExitAsyncClientCM(...))` is a type-checker workaround — the SDK type-hints want an `AsyncClient`, but it actually only uses `async with` semantics on the result.
- This pattern is a maintenance burden: when the upstream SDK changes its transport contract, this shim must be revisited.
- Use `__slots__` on the wrapper so it has zero per-instance overhead.
- Pair with a single `httpx.AsyncClient(timeout=httpx.Timeout(...), limits=httpx.Limits(...))` constructed at app startup so all MCP traffic shares one connection pool.
