---
name: serial-gpu-generation-queue
description: Serialize ML inference jobs through an asyncio queue so a single GPU cannot be starved or OOM'd by concurrent requests.
category: ml-ops
version: 1.0.0
version_origin: extracted
tags: [asyncio, gpu, queue, inference, concurrency]
source_type: extracted-from-git
source_url: https://github.com/jamiepine/voicebox.git
source_ref: main
source_commit: 476abe07fc2c1587f4b3e3916134018ebacd143d
source_project: voicebox
confidence: high
imported_at: 2026-04-18T00:00:00Z
---

# Serial GPU generation queue

## When to use
Single-GPU (or single-model-in-VRAM) service that exposes HTTP/WS endpoints which trigger inference. Without serialization, two overlapping requests race for VRAM and one of them OOMs or degrades into swap thrashing.

## Steps
1. At application startup (inside a running event loop, e.g. in FastAPI's `@app.on_event("startup")`) create a module-level `asyncio.Queue()` and a single worker coroutine that `await`s items and calls them sequentially.
2. Keep strong references to background tasks in a module-level `set`. Add `task.add_done_callback(set.discard)` so they are GC'd only after they finish. Fire-and-forget `asyncio.create_task` without a reference leaks into a Python warning and can be garbage-collected mid-run.
3. Expose `enqueue_generation(coro)` that just calls `queue.put_nowait(coro)`. Route handlers build the generation coroutine (without `await`ing it) and enqueue it, returning an id the client can poll.
4. In the worker, wrap the awaited coroutine in try/except/finally. On exception, print the traceback but never break the worker loop. Always call `queue.task_done()` in `finally`.
5. Track in-flight work outside the queue (e.g. a dict keyed by generation id) so callers can poll state, cancel, or filter stale "generating" records on restart. The queue alone doesn't give you that visibility.
6. On shutdown, drain the queue or refuse new enqueues depending on whether partial generations are acceptable.

## Counter / Caveats
- This is a single-worker pattern — if you need N concurrent jobs with N GPUs, run N workers on separate queues or use a proper job runner (Celery, Arq, RQ). A single queue with multiple workers only gives you fan-out if the model is thread-safe across devices, which most aren't.
- Coroutines in the queue capture the current event loop; enqueueing from a different loop will crash. Route handlers should build the coroutine in-context.
- Pair this with a DB-level "stale generating" cleanup on startup (`UPDATE generations SET status='failed' WHERE status='generating'`) so leftovers from a killed process don't look like in-progress work to the UI.
- If your worker ever calls blocking GPU code (e.g. non-async torch calls), wrap it with `asyncio.to_thread` so the event loop can still process incoming HTTP requests while the GPU is busy.

Source references: `backend/services/task_queue.py`, `backend/services/generation.py`, `backend/app.py` (the startup cleanup query).
