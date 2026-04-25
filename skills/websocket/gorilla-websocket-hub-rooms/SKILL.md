---
name: gorilla-websocket-hub-rooms
description: Go WebSocket hub organizing clients by room (workspace/channel) with ping/pong heartbeat, slow-client ejection, and origin check.
category: websocket
version: 1.0.0
tags: [go, websocket, gorilla, hub, realtime]
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

## When to use

- Go backend with realtime updates scoped to a tenant/channel/workspace.
- Hundreds to low-thousands of concurrent clients per server node.
- You want a single goroutine to own the room map and avoid lock contention on reads.

## Steps

1. Define the hub shape: rooms map + channels for register/unregister/broadcast:
   ```go
   type Hub struct {
       rooms      map[string]map[*Client]bool  // roomID -> clients
       broadcast  chan []byte
       register   chan *Client
       unregister chan *Client
       mu         sync.RWMutex
   }
   ```
2. Single `Run()` goroutine drains the channels and updates rooms under a write lock; broadcasts use a read lock and a slow-client slice:
   ```go
   for {
       select {
       case c := <-h.register: /* add to h.rooms[c.workspaceID] */
       case c := <-h.unregister: /* remove, close(c.send) */
       case msg := <-h.broadcast:
           h.mu.RLock()
           var slow []*Client
           for _, clients := range h.rooms {
               for c := range clients {
                   select {
                   case c.send <- msg:   // fast path
                   default:
                       slow = append(slow, c)  // backpressure: drop this client later
                   }
               }
           }
           h.mu.RUnlock()
           // under write lock, delete slow clients and close their send channels
       }
   }
   ```
3. Constants for heartbeat (ping 90% of pongWait):
   ```go
   const (
       writeWait  = 10 * time.Second
       pongWait   = 60 * time.Second
       pingPeriod = (pongWait * 9) / 10
   )
   ```
4. Origin whitelist from env with sensible localhost defaults:
   ```go
   func loadAllowedOrigins() []string {
       raw := os.Getenv("CORS_ALLOWED_ORIGINS")
       if raw == "" { raw = os.Getenv("FRONTEND_ORIGIN") }
       if raw == "" {
           return []string{"http://localhost:3000", "http://localhost:5173"}
       }
       return strings.Split(raw, ",")
   }
   ```
   Store in `atomic.Value` so `SetAllowedOrigins()` is hot-swappable.
5. Per-client read/write goroutines:
   - Write pump: ticker sends ping every `pingPeriod`; also drains `client.send`.
   - Read pump: `SetReadDeadline(now + pongWait)` on every pong handler fire; reading is what keeps the deadline alive.

## Example

Room = workspace ID. `BroadcastToWorkspace(wsID, msg)` targets one room. `SendToUser(userID, msg, excludeWorkspace)` targets all of one user's connections across rooms (user might have web + desktop + mobile open). Global `Broadcast` for cross-workspace events (daemon register).

## Caveats

- The slow-client detection relies on buffered `send` channels — size them (e.g. `make(chan []byte, 256)`) so a burst doesn't instantly disconnect healthy clients.
- Under very high fan-out (thousands of clients, high message rate) the single event-loop goroutine becomes a bottleneck; at that scale consider sharding rooms across multiple hubs.
- The client-side has no ping/pong visibility (browser API limitation); pair this with application-level heartbeat messages for true liveness detection on the frontend.
