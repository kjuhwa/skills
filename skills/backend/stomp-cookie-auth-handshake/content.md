# STOMP Cookie-Based Auth Handshake

## Problem
Browser-initiated WebSocket upgrades cannot carry a custom `Authorization` header — the native `WebSocket` API does not allow it. Using a URL query-string token leaks the token into logs and referrers. Meanwhile the app already has an HttpOnly session cookie.

## Pattern
Split auth into two stages:
1. **HTTP handshake**: a `HandshakeInterceptor` reads the cookie from the upgrade request and stashes the raw token into WebSocket session attributes.
2. **STOMP CONNECT**: a `ChannelInterceptor` validates the token, resolves identity, and binds a custom `Principal` to the session.

## Steps
1. Implement `HandshakeInterceptor.beforeHandshake`. Cast `ServerHttpRequest` to `ServletServerHttpRequest`, iterate `request.getServletRequest().getCookies()`, find the auth cookie by name. Store the value into the `attributes` map passed to the interceptor.
2. In `WebSocketMessageBrokerConfigurer.registerStompEndpoints`, register the interceptor via `.addInterceptors(authHandshakeInterceptor)`.
3. Implement `ChannelInterceptor.preSend`. On `StompCommand.CONNECT`, read the token from session attributes (`accessor.getSessionAttributes()`), validate it, build a `Principal` carrying tenant/user identity, and call `accessor.setUser(principal)`.
4. In `configureClientInboundChannel`, register the channel interceptor.
5. Reject the CONNECT frame on missing/invalid token by throwing — Spring turns this into an `ERROR` frame.

## Why this shape
- Cookie is HttpOnly, so not reachable by JS — mitigates token exfiltration.
- Principal binding happens once at CONNECT, so downstream `@MessageMapping` handlers see the authenticated user via `Principal` parameter — no re-parsing per message.
- Keeping the two stages separate lets you deny the handshake (HTTP 401) vs. deny the STOMP CONNECT (STOMP ERROR frame) with the right semantics.

## Anti-patterns
- Passing the token via URL query string — it lands in access logs and browser history.
- Validating the token only in `@MessageMapping` handlers — the session is already open and billable.
- Storing the full `Authentication` object in session attributes — keep only the raw token; validate fresh at CONNECT.

## Generalize
Any WebSocket + STOMP backend whose clients are browsers using cookie-based session auth. Not STOMP-specific: the handshake-interceptor half applies to raw WebSocket too.
