# maturin-cross-platform-python-wheel-build — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `.github/workflows/python-build-and-release-package.yml:72-118`
- `rust/onnx/maturin.sh:1-40`
- `python/pyproject.toml:72-78`

## When this pattern is a fit

Distributing a Python package that wraps Rust performance-critical code and must publish pre-compiled wheels for all major platforms.

## When to walk away

- ONNX Runtime static build is ~5 min and ~500MB; only cache on Linux; use prebuilt binaries on macOS/Windows where possible.
- manylinux compliance ties to glibc + GCC version; use the right manylinux container or auditwheel will reject.
- macOS universal2 wheels add build time; native ARM runners (ubuntu-24.04-arm) are faster than cross-builds.
- Wheel naming convention is strict; trust maturin's defaults instead of overriding.
