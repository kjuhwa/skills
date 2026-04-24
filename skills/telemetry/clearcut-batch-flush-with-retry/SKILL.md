---
name: clearcut-batch-flush-with-retry
description: Buffer telemetry events in-memory with drop-oldest overflow, flush on a timer, optimistically remove events before send, requeue on transient errors, honor server-provided `next_request_wait_millis`, and race a final flush with a shutdown deadline.
category: telemetry
version: 1.0.0
version_origin: extracted
tags: [telemetry, batching, retry, clearcut, shutdown]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/ChromeDevTools/chrome-devtools-mcp.git
source_ref: main
source_commit: 0a6aaa52ebacb2db834ffa437863e5844aa3730b
source_project: chrome-devtools-mcp
source_path: src/telemetry/watchdog/ClearcutSender.ts
imported_at: 2026-04-18T00:00:00Z
---

# Telemetry Batch Flush with Retry and Shutdown Drain

## When to use

- You're shipping low-value-per-event telemetry to a batch endpoint (Google Clearcut, any log pipeline) and want to minimize request overhead.
- Events arrive continuously; sending per-event wastes requests and money.
- You need to honor server-side rate-limit hints and survive transient network flakiness without losing events.

## How it works

- Buffer events in a bounded array (`MAX_BUFFER_SIZE = 1000`). On enqueue, if the buffer is full, drop the *oldest* event with a log line (never tail-drop — you want to keep most-recent behavior visible).
- Single-shot flush timer: default 15 min. Only start it when the first event arrives; don't spin a perpetual timer on an idle process.
- On flush: guard with `#isFlushing`, copy `buffer` to a local and empty it *before* the network call (prevents a shutdown race from double-sending), then send.
- Response handling: `response.ok` → read `next_request_wait_millis` and clamp to `MIN_RATE_LIMIT_WAIT_MS` (e.g. 30s) for the next flush. 5xx/429 → transient: requeue at the *front* so order is preserved. 4xx other → permanent: drop and log.
- Shutdown path: clear the flush timer, enqueue a synthetic `server_shutdown` event, then `await Promise.race([finalFlush(), setTimeout(SHUTDOWN_TIMEOUT_MS)])`. Never `await` flush unbounded on exit.
- Rotate `session_id` at a fixed interval (e.g. 24h) so long-running processes get session breaks in the data.

## Example

```ts
async #flush() {
  if (this.#isFlushing) return;
  if (this.#buffer.length === 0) { this.#scheduleFlush(this.#flushIntervalMs); return; }
  this.#isFlushing = true;
  let nextDelay = this.#flushIntervalMs;
  const eventsToSend = [...this.#buffer];
  this.#buffer = []; // remove first, so a concurrent #finalFlush won't double-send
  try {
    const result = await this.#sendBatch(eventsToSend);
    if (result.success) {
      if (result.nextRequestWaitMs !== undefined)
        nextDelay = Math.max(result.nextRequestWaitMs, MIN_RATE_LIMIT_WAIT_MS);
    } else if (result.isPermanentError) {
      logger('Permanent error, dropped', eventsToSend.length, 'events');
    } else { // transient: requeue at front, keep order
      this.#buffer = [...eventsToSend, ...this.#buffer];
    }
  } catch (e) {
    this.#buffer = [...eventsToSend, ...this.#buffer];
  } finally {
    this.#isFlushing = false;
    this.#scheduleFlush(nextDelay);
  }
}

async sendShutdownEvent() {
  if (this.#flushTimer) clearTimeout(this.#flushTimer);
  this.enqueueEvent({server_shutdown: {}});
  await Promise.race([this.#finalFlush(), new Promise(r => setTimeout(r, SHUTDOWN_TIMEOUT_MS))]);
}
```

## Gotchas

- The "remove from buffer before send, restore on transient error" order is load-bearing. The opposite order (send-then-remove) loses events if a simultaneous shutdown path calls `finalFlush` on the same buffer.
- Set an `AbortController` with a `REQUEST_TIMEOUT_MS` (e.g. 30s) on fetch. A hung endpoint without a timeout keeps the flush guard set and stalls shutdown.
- Distinguish 429 (retry) from 4xx other (drop). A lot of retry systems treat all 4xx as permanent and silently bleed rate-limited events.
- Requeue at the *front* of the buffer on transient errors to preserve chronological order. Appending shuffles the timeline.
- `session_id` should be stable for the session but rotated for very long processes (daemon mode). Include it in every event envelope.
