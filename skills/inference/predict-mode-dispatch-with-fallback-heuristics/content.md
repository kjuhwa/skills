# predict-mode-dispatch-with-fallback-heuristics — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `go/magika/scanner.go:59-93`
- `python/src/magika/magika.py:170-210`
- `rust/lib/src/file.rs:1-70`

## When this pattern is a fit

Robust file-type or content classification that must handle edge cases (empty files, <8-byte files, corrupted files, symlinks).

## When to walk away

- min_file_size_for_dl is model-specific; too low = wasted inference, too high = silent miss.
- UTF-8 validity check is naive — Latin-1, UTF-16, etc. look invalid; consider extending if you support non-UTF-8 text.
- Symlink semantics differ on Windows vs *nix; check is_symlink() before reading.
- Score thresholds are per-model-version; bumping the model requires recalibrating thresholds.
