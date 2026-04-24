---
name: python-entrypoint-plugin-loader
description: Lazy plugin loader built on importlib.metadata entry_points — discovers installed plugins by entry-point group, per-plugin try/except so one broken plugin can't kill the host, and a conventional register_converters(host, **kwargs) entry function.
category: plugin-architecture
version: 1.0.0
tags: [plugin-architecture, python, importlib, entry-points, packaging]
source_type: extracted-from-git
source_url: https://github.com/microsoft/markitdown.git
source_ref: main
source_commit: 604bba13da2f43b756b49122cb65bdedb85b1dff
source_project: markitdown
source_path: packages/markitdown/src/markitdown/_markitdown.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
version_origin: extracted
---

# Python entry-point plugin loader

The packaging-native Python plugin pattern: host app declares an **entry-point group name**, plugin packages register an entry point under that group in their `pyproject.toml`, and the host discovers plugins at runtime via `importlib.metadata.entry_points`. No config file, no import path hacking, no plugin registry service. Install the plugin via pip; it becomes discoverable.

## Host side — the loader

```python
import traceback
from importlib.metadata import entry_points
from typing import Any, List, Union
from warnings import warn

_plugins: Union[None, List[Any]] = None    # sentinel: None means "not loaded yet"

def _load_plugins() -> List[Any]:
    """Lazy — returns cached list after first call."""
    global _plugins
    if _plugins is not None:
        return _plugins

    _plugins = []
    for entry_point in entry_points(group="mylib.plugin"):
        try:
            _plugins.append(entry_point.load())
        except Exception:
            # One broken plugin MUST NOT kill the host.
            tb = traceback.format_exc()
            warn(f"Plugin '{entry_point.name}' failed to load ... skipping:\n{tb}")

    return _plugins
```

Two critical design choices:

1. **Per-plugin try/except around `.load()`.** Plugins ship separately; one plugin's broken dependency can't crash everyone else.
2. **Sentinel `None` for "not loaded."** Distinguishes "haven't tried yet" from "tried and found zero." Guards against repeat scans.

## Host — enable plugins on demand

```python
class MyHost:
    def __init__(self, *, enable_plugins: bool = False, **kwargs):
        if enable_plugins:
            self.enable_plugins(**kwargs)

    def enable_plugins(self, **kwargs):
        for plugin in _load_plugins():
            try:
                plugin.register_converters(self, **kwargs)   # plugin entry function
            except Exception:
                tb = traceback.format_exc()
                warn(f"Plugin '{plugin}' failed to register converters:\n{tb}")
```

Notice the second try/except: loading the module succeeded, but registration might still fail (bad dependency, version mismatch). Again, warn and move on.

## Plugin side — the contract

A plugin package exposes one function and one version constant:

```python
# mylib_sample_plugin/__init__.py
__plugin_interface_version__ = 1      # stable, versioned contract

def register_converters(host, **kwargs):
    """Called by the host during enable_plugins() to register this plugin's contributions."""
    host.register_converter(MyConverter())
```

The plugin's `pyproject.toml` declares the entry point:

```toml
[project.entry-points."mylib.plugin"]
sample_plugin = "mylib_sample_plugin"
```

The key `sample_plugin` is arbitrary (conventionally the plugin name); the value is the fully-qualified module name that will be `importlib.import_module`'d at `.load()` time. `.load()` returns the module object, so `register_converters` is called as `module.register_converters(...)`.

## Why entry points vs alternatives

| Alternative | Problem |
|---|---|
| `PYTHONPATH` + config file listing modules | Requires the user to maintain two things in sync — config and `pip install`. |
| Dynamic `importlib.import_module(name)` from a list | Host must know plugin names ahead of time; no discovery. |
| `pkgutil.iter_modules` on a namespace package | Works, but no version contract, no per-plugin metadata. |
| Entry points (this pattern) | `pip install my-plugin` → plugin is discoverable. Uninstall → gone. No config drift. |

## Enabling plugins as opt-in vs opt-out

Most hosts want plugins **off by default** for reproducibility — a user's environment shouldn't silently change behavior. Two common toggles:

```python
# CLI flag
md = MarkItDown(enable_plugins=args.use_plugins)

# Environment variable (good for MCP/daemon scenarios)
ENABLED = os.getenv("MYLIB_ENABLE_PLUGINS", "false").strip().lower() in ("true", "1", "yes")
```

## Listing plugins (diagnostic)

Provide a CLI flag like `--list-plugins` that prints each discovered plugin's name and module path, so users can verify their install is picked up:

```python
for ep in entry_points(group="mylib.plugin"):
    print(f"{ep.name}\t{ep.value}")
```

## Anti-patterns

- **Catching only `ImportError` around `.load()`.** Plugins fail in more ways than that — broken metadata, syntax errors, side effects at import. Catch `Exception`.
- **Registering globals at plugin import time.** Do registration in `register_converters(host, ...)`, not as a module side effect — you want the host to control when plugins take effect.
- **No version constant on the plugin side.** When the contract evolves, you have no way to refuse an incompatible plugin gracefully.
- **Failing the host on plugin error.** Even in strict mode, a warning + skip is usually correct; bubble up only for explicitly-configured "strict-plugins" mode.

## Variations

- **Version-gated loading.** Check `plugin.__plugin_interface_version__` before calling `register_converters`; refuse or call a compatibility shim on mismatch.
- **Lazy plugin invocation.** For very large plugin sets, defer `.load()` until the plugin is actually asked to handle an input (entry points carry enough metadata to decide without loading).
- **Plugin-provided kwargs plumb-through.** The `**kwargs` on `register_converters` lets the host pass shared state (DB handles, HTTP sessions, LLM clients) so plugins don't have to bootstrap their own.
