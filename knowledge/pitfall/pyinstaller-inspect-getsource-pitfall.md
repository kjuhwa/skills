---
version: 0.1.0-draft
name: pyinstaller-inspect-getsource-pitfall
summary: PyInstaller's default `.pyc`-only bundling breaks any package that calls `inspect.getsource()` at import or runtime.
type: knowledge
category: pitfall
confidence: high
tags: [pyinstaller, inspect, typechecked, torchscript, freezing]
source_type: extracted-from-git
source_url: https://github.com/jamiepine/voicebox.git
source_ref: main
source_commit: 476abe07fc2c1587f4b3e3916134018ebacd143d
source_project: voicebox
linked_skills: [pyinstaller-ml-hidden-imports-playbook, pyinstaller-shim-fake-module, new-ml-backend-dependency-audit]
imported_at: 2026-04-18T00:00:00Z
---

# PyInstaller `inspect.getsource()` pitfall

## Problem
PyInstaller freezes Python modules as `.pyc` bytecode by default. `inspect.getsource()` requires the original `.py` source on disk — when it fails inside a frozen binary the error reads `OSError: could not get source code` or, in a torch context, `TorchScript cannot get source`. Common triggers:

- Typeguard's `@typechecked` decorator (used by `inflect` and many HF model classes).
- `torch.jit.script` (seen in descript-audio-codec's Snake1d, some HF modeling files).
- HF Transformers' `modeling_*` modules that call `inspect.getsource(cls)` inside `_init_weights` or tokenizer loading.
- Libraries that parse their own signatures at import time to build CLIs (Typer, some click extensions).

## Why `--hidden-import` is not enough
`--hidden-import` tells PyInstaller "bundle this module" but the bundling is still `.pyc`. `getsource()` reads the `.py` and fails.

## Fix (two options)
1. **`--collect-all <pkg>`**: bundles both the compiled `.pyc` and the original `.py` source plus data files. Use this whenever the package has either `inspect.getsource` calls, `@typechecked`, `torch.jit.script`, or runtime data files — it's the safe default.
2. **Rewrite-as-shim**: if the dependency is dragged in transitively and you only use one symbol, vendor the minimal class into your own package and register a `sys.modules` shim so the heavy dependency never loads. This skips both `getsource` and the entire transitive side-chain.

## Detection checklist
Grep the clone before integration:
```bash
grep -r "inspect.getsource\|@typechecked\|torch.jit.script" path/to/package
```
Any hit means `--collect-all` is mandatory.

## Related skills
`pyinstaller-ml-hidden-imports-playbook` (the full flag recipe), `pyinstaller-shim-fake-module` (the vendor-and-shim alternative), `new-ml-backend-dependency-audit` (the Phase 0 grep-first workflow).

Source references: `backend/build_binary.py` (comments next to `--collect-all inflect`, `--collect-all qwen_tts`, `--collect-all librosa`); `backend/utils/dac_shim.py` (the shim pattern motivated by this exact issue).
