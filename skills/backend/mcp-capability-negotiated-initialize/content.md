# Capability-negotiated MCP `initialize`

## Problem
The MCP handshake is `initialize` (client → server) with a `capabilities` object, then server replies with its own capabilities. Some MCP clients reject the handshake if the server advertises a capability the client can't honor (e.g. `sampling`, which requires the client to host an LLM). Others will happily call `prompts/list` even against a server that never said it had prompts, leading to surprising errors and broken UI. The fix is symmetric negotiation — advertise only what the client asked for.

## Pattern
Read the incoming `params.capabilities` in `handleInitialize`, then conditionally populate `serverCapabilities`:

```java
Map<String,Object> client = (Map) params.getOrDefault("capabilities", Map.of());
Map<String,Object> server = new HashMap<>();

server.put("tools", Map.of("listChanged", true));  // always on

if (client.containsKey("prompts"))
  server.put("prompts", Map.of("listChanged", true));

if (client.containsKey("resources"))
  server.put("resources", Map.of("subscribe", true, "listChanged", true));

if (client.containsKey("sampling"))
  server.put("sampling", Map.of("createMessage", true));

return Map.of(
  "protocolVersion", "2024-11-05",
  "capabilities", server,
  "serverInfo", Map.of("name", name, "version", ver, "id", id));
```

Tools is always on (minimum viable MCP). Everything else is gated on the *presence of the key* in the client's map — not on its truthiness, since some clients send `{}` as a "yes, I support it with defaults" signal.

## When to use
- Any MCP server implementation beyond a toy demo.
- Servers that embed sampling or resources subscription (both are commonly unsupported on the client side).
- When seeing "Method not found: prompts/list" errors with no obvious cause — the client likely never saw a `prompts` capability in your response.

## Pitfalls
- **Don't check `== Boolean.TRUE`**: the spec allows `{}` as an enable signal. Use `containsKey`.
- **Notifications/initialized is not a response**: after you return from `initialize`, the client sends `notifications/initialized`. Handle it by returning `Map.of()` — do not reply with a JSON-RPC `result` envelope (it has no `id`).
- **Match `protocolVersion` echo**: echo the version the client sent if you support it, or pick the highest you both support. Don't hardcode `2024-11-05` without checking.
- **Keep capabilities tree truthful**: if you advertise `resources.subscribe`, implement `resources/subscribe`. Clients will call it.
- **Log the negotiated set**: the asymmetry between "what I announced" and "what the client thinks I announced" is the #1 source of MCP handshake bugs — log both sides once per session.
