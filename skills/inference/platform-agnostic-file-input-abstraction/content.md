# platform-agnostic-file-input-abstraction — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `rust/lib/src/input.rs:15-102`
- `python/src/magika/magika.py:139-210`
- `go/magika/scanner.go:48-54`

## When this pattern is a fit

An inference engine must serve multiple input sources (file, bytes, stream) without duplicating logic per source type.

## When to walk away

- Seekable requirement excludes pipes / stdin; buffer first if you need to support them.
- Reading whole-file into &[u8] or BytesIO loses the streaming benefit; design APIs to discourage it.
- Async trait objects (Box<dyn AsyncInput>) lose monomorphization; trade ergonomics vs perf.
- metadata().len() can be wrong on sparse / special files (/dev/random returns u64::MAX).
