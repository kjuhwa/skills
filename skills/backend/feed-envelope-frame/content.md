# FeedEnvelope Frame

## Problem
Real-time channels carry multiple kinds of frames: "here is the initial state" (snapshot), "here is a patch" (delta), "your subscribe succeeded" (ack), "something broke" (error). Without a uniform envelope, clients branch on duck-typing and requests/responses cannot be correlated across reconnects.

## Pattern
A single generic wrapper:

```
FeedEnvelope<T> {
    Type type;              // ACK | SNAPSHOT | DELTA | ERROR
    PayloadKind kind;       // METRIC | SCATTER | TABLE | ALERT | ...
    String requestId;       // correlation id, never null
    T data;                 // typed payload, nullable for ACK/ERROR
    String errorCode;       // null unless type==ERROR
    String errorMessage;    // null unless type==ERROR
}
```

Plus static factories: `ack(requestId, kind)`, `snapshot(requestId, kind, data)`, `delta(requestId, kind, data)`, `error(requestId, kind, code, msg)`. Each factory null-coalesces `requestId` to a fresh UUID so a missing correlator never propagates.

## Steps
1. Define `Type` and `PayloadKind` as enums.
2. Make `FeedEnvelope` a Java record (or immutable class) with a generic payload `T`.
3. Annotate with `@JsonInclude(Include.NON_NULL)` so optional fields disappear from the wire.
4. Add static factories — the only way to construct. Hide the all-args constructor.
5. Provide `nvl(String)` helper: returns input if non-null-non-blank, else `UUID.randomUUID().toString()`.
6. Version the envelope (either in frame header or via PayloadKind) so clients can reject unknown kinds.

## Why this shape
- Clients branch once on `type`, then safely read `data`.
- `requestId` survives reconnects — client can re-request the snapshot tied to an earlier SUBSCRIBE.
- Factory-only construction prevents partially-populated error frames (missing code, etc.).
- `@JsonInclude(NON_NULL)` keeps happy-path frames lean.

## Anti-patterns
- Using separate destinations for snapshot vs. delta — clients have to reconcile ordering across channels.
- Putting envelope fields into STOMP native headers — breaks SSE/long-poll transport parity.
- Letting `requestId` be nullable — you will regret it the first time a bug report can't be traced.

## Generalize
Any multi-frame push API. The envelope shape is transport-independent — same record works for STOMP, SSE, Socket.IO, or a raw WebSocket JSON stream.
