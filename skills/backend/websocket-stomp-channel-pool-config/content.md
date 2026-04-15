# Reference implementation notes

Source: `lucida-alarm` —
- `config/websocket/WebSocketConfig.java`
- `config/websocket/StompChannelInterceptor.java`
- `config/websocket/WebSocketSessionTrackerConfig.java`

Key commit: `b18922bf` — adopted dedicated channel pools after default shared pool stalled under broadcast bursts.
