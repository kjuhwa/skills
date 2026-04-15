# STOMP Principal + JWT on CONNECT

## Problem
Multi-tenant real-time services fan out messages per-tenant. Every SUBSCRIBE / SEND frame needs to know `organizationId` and `userId`. Re-parsing a JWT on every frame is expensive and error-prone.

## Pattern
Validate once at `STOMP CONNECT`, build a custom `Principal` carrying (orgId, userId, sessionId), and bind it via `accessor.setUser(principal)`. All later frames expose it via the `Principal` argument on `@MessageMapping` / `@SubscribeMapping` or `accessor.getUser()`.

## Steps
1. Define `TenantPrincipal implements Principal` with fields `orgId`, `userId`, `sessionId`. Override `getName()` to return something stable (e.g. `orgId + ":" + userId`).
2. Implement `ChannelInterceptor.preSend`. Use `StompHeaderAccessor.wrap(message)`.
3. Gate on `accessor.getCommand() == StompCommand.CONNECT`.
4. Pull the token from `accessor.getSessionAttributes()` (populated by the handshake interceptor — see `stomp-cookie-auth-handshake`).
5. Call your `JwtTokenService.parse(token)` → assert `orgId` and `userId` present; throw a typed auth exception otherwise.
6. Construct `TenantPrincipal`, call `accessor.setUser(principal)`. Optionally stash `orgId` as a session attribute for fast lookup.
7. Register the interceptor in `configureClientInboundChannel`.

## Why this shape
- Single parse per session; cheap per-frame lookups.
- `Principal` is Spring's standard integration point — `@MessageMapping` methods can accept it as a parameter, `@SendToUser` destinations resolve against `Principal.getName()`.
- Failing at CONNECT sends a clean STOMP ERROR frame; later failures would force manual error routing.

## Anti-patterns
- Storing a full `Authentication` object in session attributes — bloats the WebSocket session and risks leaking refresh tokens.
- Using `accessor.getFirstNativeHeader("Authorization")` — fragile, and impossible from a browser WebSocket client.
- Skipping `accessor.setUser` and passing orgId through every frame header — bug-prone and bypasses Spring's user-destination resolver.

## Generalize
Any STOMP backend with multi-tenant scoping. For non-JWT auth (session cookie, opaque token), swap step 5 for your own resolver — the shape is identical.
