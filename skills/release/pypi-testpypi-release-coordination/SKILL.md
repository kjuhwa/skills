---
name: pypi-testpypi-release-coordination
description: Release pipeline tags python-test-v* for TestPyPI dry runs and python-v* for PyPI; the workflow validates tag-vs-pyproject version, builds wheels, smoke-tests on TestPyPI, then promotes to PyPI.
category: release
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [magika, release]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Pypi Testpypi Release Coordination

**Trigger:** You publish a Python package and want a staged rollout instead of pushing straight to PyPI.

## Steps

- Use distinct tag prefixes for dry-run vs prod (python-test-v* → TestPyPI, python-v* → PyPI).
- On tag push, extract the version, compare against pyproject.toml — abort on mismatch.
- Build all platform wheels; download as artifacts; install + smoke-test each one in a fresh venv.
- Push to TestPyPI; pip install from TestPyPI in a clean container; run the smoke test again.
- Only on green TestPyPI smoke do you publish to real PyPI.
- Auto-generate GitHub Release notes from the tag for human-readable changelogs.

## Counter / Caveats

- Version bumps in pyproject.toml are still manual — easy to forget and create tag/version mismatch.
- TestPyPI is a separate index with separate wheel storage; rate limits and outages happen.
- PyPI does not allow re-uploading the same version; use -rcN tags during pre-release iteration.
- Token leaks compromise the package; use fine-grained GitHub Secrets and rotate.

## Source

Extracted from `magika` (https://github.com/google/magika.git @ main).

Files of interest:
- `.github/workflows/python-build-and-release-package.yml:27-70`
