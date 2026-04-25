# python-rust-client-fallback-with-warning — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `python/src/magika/cli/magika_rust_client_not_found_warning.py:1-40`
- `python/src/magika/cli/magika_client.py:15-25`
- `python/pyproject.toml:72-78`

## When this pattern is a fit

Distributing a Python package whose performance path depends on a native binary that may not be available on uncommon architectures.

## When to walk away

- Two implementations doubles your test surface; share a golden test suite to keep them aligned.
- Performance gap can be 10–100x; users on slow platforms may give up — make the warning actionable.
- Version skew between Rust binary and Python package is real; document compatibility ranges.
- Warnings can spook users; keep them brief and tell them exactly how to opt out.
