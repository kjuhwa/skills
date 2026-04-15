# Netty TCP Reconnect with Exponential Backoff

## When to use
Persistent TCP client to a device/gateway/broker that may drop silently (EOF) or reject new connections briefly.

## Steps
1. On `channelInactive` / EOF / read timeout, schedule reconnect via `EventLoopGroup.schedule`.
2. Backoff: start 100ms, multiply ×2 each attempt, cap at 30s. Reset on successful connect.
3. Validate channel state before every write (`channel.isActive()`); queue or drop per policy.
4. Set `SO_KEEPALIVE` and `TCP_NODELAY` in `ChannelOption` at bootstrap.
5. Emit a metric/log on every reconnect; alert after M reconnects per minute.

## Watch out for
- Don't reconnect in a tight loop without backoff — it amplifies outages.
- Protect against infinite reconnect on permanent auth failure: separate "retryable" from "fatal" errors.
