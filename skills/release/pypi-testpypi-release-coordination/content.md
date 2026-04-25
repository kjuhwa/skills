# pypi-testpypi-release-coordination — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `.github/workflows/python-build-and-release-package.yml:27-70`

## When this pattern is a fit

You publish a Python package and want a staged rollout instead of pushing straight to PyPI.

## When to walk away

- Version bumps in pyproject.toml are still manual — easy to forget and create tag/version mismatch.
- TestPyPI is a separate index with separate wheel storage; rate limits and outages happen.
- PyPI does not allow re-uploading the same version; use -rcN tags during pre-release iteration.
- Token leaks compromise the package; use fine-grained GitHub Secrets and rotate.
