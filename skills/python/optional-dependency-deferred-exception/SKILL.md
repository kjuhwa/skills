---
name: optional-dependency-deferred-exception
description: Import a heavy/optional dependency inside try/except at module load, stash sys.exc_info() for later, and raise a tailored MissingDependencyException with the original traceback only when the feature is actually invoked.
category: python
version: 1.0.0
tags: [python, optional-dependency, packaging, extras, imports]
source_type: extracted-from-git
source_url: https://github.com/microsoft/markitdown.git
source_ref: main
source_commit: 604bba13da2f43b756b49122cb65bdedb85b1dff
source_project: markitdown
source_path: packages/markitdown/src/markitdown/converters/_outlook_msg_converter.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
version_origin: extracted
---

# Optional dependency with deferred exception

When your library supports many file formats (or backends, or integrations), you don't want to force every user to install every heavy dependency — Azure SDK, mammoth, pandas, olefile, etc. But you also want **module import to succeed** regardless, so missing deps don't break `pip install yourlib[core]`. The pattern: import inside try/except at module load, stash `sys.exc_info()` in a module-level sentinel, and raise a tailored exception with the original traceback only when the user actually invokes the missing feature.

## The shape

```python
import sys

# Try loading the optional dependency. Don't fail module import if it's missing.
_dependency_exc_info = None
try:
    import mammoth                       # heavy, optional
except ImportError:
    _dependency_exc_info = sys.exc_info()

MISSING_DEPENDENCY_MESSAGE = (
    "{converter} requires optional dependencies that are not installed. "
    "Install them with: pip install 'yourlib[{feature}]'"
)

class MissingDependencyException(Exception):
    pass


class DocxConverter:
    def convert(self, file_stream, stream_info, **kwargs):
        # Lazy check — only raise if someone actually tries to use this converter.
        if _dependency_exc_info is not None:
            raise MissingDependencyException(
                MISSING_DEPENDENCY_MESSAGE.format(
                    converter=type(self).__name__,
                    feature="docx",
                )
            ) from _dependency_exc_info[1].with_traceback(_dependency_exc_info[2])

        return mammoth.convert_to_html(file_stream, **kwargs)
```

Three important subtleties:

1. **`sys.exc_info()` captured at import time.** Holds `(exc_type, exc_value, traceback)` — the original ImportError and the line that raised it. You lose this if you don't save it immediately; later `sys.exc_info()` returns `(None, None, None)`.
2. **`from exc_value.with_traceback(tb)`.** Preserves the original traceback across the re-raise so the user sees *why* the import failed (missing shared library? wrong version?), not just "it was missing."
3. **Lazy check in `convert()`, not `accepts()`.** `accepts()` must be free to return False without triggering errors — the dispatcher should be able to try other converters. Only fail when the user has committed to this code path.

## Why not check at import time

```python
# Tempting but wrong:
try:
    import mammoth
except ImportError:
    raise ImportError("Install mylib[docx]")   # <- kills module load
```

This breaks for users who installed `yourlib[core]` and never touch DOCX. Your whole library becomes unusable because they don't have mammoth.

## Dual-extras pattern

For modules that can have more than one optional dep path:

```python
_xlsx_dependency_exc_info = None
try:
    import pandas as pd
    import openpyxl                      # for .xlsx
except ImportError:
    _xlsx_dependency_exc_info = sys.exc_info()

_xls_dependency_exc_info = None
try:
    import pandas as pd                  # noqa: F811 (reimport)
    import xlrd                          # for .xls
except ImportError:
    _xls_dependency_exc_info = sys.exc_info()
```

Each feature fails independently; xlsx users don't need xlrd and vice versa.

## Typed fallback — when type-annotations reference the missing import

If your class signatures use types from the optional dep (e.g., `azure.core.credentials.TokenCredential`), you can't just leave them undefined — the module won't parse. Define local stub classes in the except branch:

```python
try:
    from azure.ai.documentintelligence import DocumentIntelligenceClient
    from azure.core.credentials import AzureKeyCredential, TokenCredential
except ImportError:
    _dependency_exc_info = sys.exc_info()
    # Stubs so type hints and isinstance() checks don't crash the module.
    class AzureKeyCredential: pass
    class TokenCredential:    pass
    class DocumentIntelligenceClient: pass
```

Callers then pass real objects only when the extras are installed, and `accepts()` gates entry via the sentinel.

## Guidance for MissingDependencyException

- Extend a specific exception class (not plain `ImportError`) so callers can distinguish "user didn't install an extra" from "a truly broken import."
- Include **the install command** in the message — `pip install 'yourlib[docx]'` — not a docs URL. Users read error messages, not docs.
- Chain the original traceback via `raise NewExc(...) from orig_value.with_traceback(orig_tb)`. Without `.with_traceback`, the chain shows the `raise` site, not the original import failure.

## Anti-patterns

- **Lazy `import mammoth` inside `convert()` every call.** Works but pays the import-cache lookup per call; the sentinel version is cleaner.
- **Swallowing the original exception.** `raise MissingDependencyException(...)` without `from ...` loses the root cause.
- **Gating on a variable like `HAS_MAMMOTH = False`.** Lose the original traceback; the user never sees *why* the import failed.
- **Per-method checks duplicated in every method.** Extract a helper:

  ```python
  def _assert_dep(exc_info, *, feature):
      if exc_info is not None:
          raise MissingDependencyException(...) from exc_info[1].with_traceback(exc_info[2])
  ```

## Variations

- **Soft feature detection.** Expose a function `is_xxx_available() -> bool` so callers can preflight without catching the exception.
- **Extras metadata.** Document the `pip install 'yourlib[feature]'` names in `pyproject.toml` so the error message's install instruction is accurate and stable.
- **`importlib.util.find_spec`**: for pure presence checks without running the dep's top-level code, use `find_spec("mammoth") is not None`. Doesn't import; doesn't capture traceback. Good when you just want the bool.
