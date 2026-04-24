# async-sync-inference-bridge-with-tokio-blocking — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `rust/lib/src/session.rs:40-47`
- `rust/lib/src/future.rs`
- `rust/lib/src/input.rs:15-102`

## When this pattern is a fit

Building an inference library that must serve both async (HTTP servers, tokio apps) and sync (CLIs, scripts) clients without two parallel codepaths.

## When to walk away

- block_in_place panics outside a tokio multi-thread runtime; provide a thread-pool fallback.
- Sync wrappers carry runtime startup overhead; long sync loops are slower than one async batch.
- File handle lifetimes differ: async drops at .await, sync holds until drop — beware file lock interactions.
- Mixed sync/async can deadlock; document and lint against it.
