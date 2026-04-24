# sparse-text-data-utf8-detection-fallback — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `go/magika/scanner.go:68-73`
- `rust/lib/src/file.rs:1-40`

## When this pattern is a fit

Tiny files where running the model would be more expensive than meaningful, but you still need a defensible label.

## When to walk away

- Random binary data is occasionally valid UTF-8 by coincidence; expect a false-positive rate.
- UTF-16 / Latin-1 / Windows-1252 fail UTF-8 validation; users with non-UTF-8 text will see 'unknown'.
- No granular text-type detection (Markdown vs Python vs Shell) — the heuristic is intentionally coarse.
- Tunable threshold should be exposed so callers can change the bypass policy.
