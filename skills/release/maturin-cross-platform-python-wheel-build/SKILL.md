---
name: maturin-cross-platform-python-wheel-build
description: Build native Python wheels with maturin (PyO3) embedding a Rust binary + ONNX Runtime static library, across manylinux, macOS universal2, and Windows MSVC.
category: release
version: 1.0.0
version_origin: extracted
confidence: high
tags: [magika, release]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Maturin Cross Platform Python Wheel Build

**Trigger:** Distributing a Python package that wraps Rust performance-critical code and must publish pre-compiled wheels for all major platforms.

## Steps

- Set requires=['maturin>=1.12.2'] and build-backend='maturin' in pyproject.toml [build-system].
- Define a GitHub Actions matrix over (ubuntu-latest, macos-14, windows-latest) × target arch (x86_64, aarch64).
- On Linux, run a before-script to build ONNX Runtime as a static library; cache the artifacts to avoid 5+ min rebuilds.
- Invoke maturin with --release --out=../dist; let it produce platform-tagged wheels.
- Download all platform wheels as artifacts and smoke-test installation on every supported Python version (3.8–3.13).
- Pre-flight: validate version matches git tag, copyright headers present, package metadata correct.
- Pin ONNX Runtime per Python minor version where needed (e.g. 1.24.1 for 3.14+, 1.20.0 for 3.9).

## Counter / Caveats

- ONNX Runtime static build is ~5 min and ~500MB; only cache on Linux; use prebuilt binaries on macOS/Windows where possible.
- manylinux compliance ties to glibc + GCC version; use the right manylinux container or auditwheel will reject.
- macOS universal2 wheels add build time; native ARM runners (ubuntu-24.04-arm) are faster than cross-builds.
- Wheel naming convention is strict; trust maturin's defaults instead of overriding.

## Source

Extracted from `magika` (https://github.com/google/magika.git @ main).

Files of interest:
- `.github/workflows/python-build-and-release-package.yml:72-118`
- `rust/onnx/maturin.sh:1-40`
- `python/pyproject.toml:72-78`
