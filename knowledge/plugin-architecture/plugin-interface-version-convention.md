---
version: 0.1.0-draft
name: plugin-interface-version-convention
summary: Plugin packages expose a module-level __plugin_interface_version__ = 1 constant so the host can detect ABI-incompatible plugins at load time and either refuse them or invoke a compatibility shim.
category: plugin-architecture
confidence: medium
tags: [plugin-architecture, versioning, abi, contract, python]
source_type: extracted-from-git
source_url: https://github.com/microsoft/markitdown.git
source_ref: main
source_commit: 604bba13da2f43b756b49122cb65bdedb85b1dff
source_project: markitdown
source_path: packages/markitdown-sample-plugin/README.md
imported_at: 2026-04-18T00:00:00Z
---

# `__plugin_interface_version__` — a stable, plugin-declared contract version

The convention markitdown ships with in its sample plugin:

```python
# mylib_sample_plugin/__init__.py

# The version of the plugin interface that this plugin uses.
# The only supported version is 1 for now.
__plugin_interface_version__ = 1

def register_converters(markitdown, **kwargs):
    """Called each time a MarkItDown instance is created."""
    markitdown.register_converter(MyConverter())
```

## Why a dedicated version constant

Package version (`__version__`) tracks the plugin's own evolution. It says nothing about which host API the plugin was written against. When the host's plugin contract evolves — new required methods, changed signatures, new kwargs — the host needs a cheap way to tell the plugin apart from incompatible ones *without executing them*.

`__plugin_interface_version__` is:

- **Host-contract-scoped.** The host defines the legal values (currently `1`). Plugins pick from that set.
- **Independent of the plugin's own version.** A plugin at `__version__ = "3.7.2"` still declares `__plugin_interface_version__ = 1`.
- **Cheap to read.** `getattr(plugin, "__plugin_interface_version__", None)` before calling any registration code.

## Host-side usage (when the contract evolves)

```python
SUPPORTED_INTERFACE_VERSIONS = {1, 2}

for plugin in _load_plugins():
    v = getattr(plugin, "__plugin_interface_version__", None)
    if v not in SUPPORTED_INTERFACE_VERSIONS:
        warn(
            f"Plugin {plugin.__name__} declares interface version {v}; "
            f"this host supports {sorted(SUPPORTED_INTERFACE_VERSIONS)}. Skipping."
        )
        continue

    if v == 1:
        plugin.register_converters(host, **kwargs)        # legacy shape
    elif v == 2:
        plugin.register(host, context=host.context, **kwargs)  # new shape
```

Migration path: plugins can be written for v1 forever; new plugins opt into v2; the host carries both branches until v1 is removed.

## What v1 means in markitdown specifically

The v1 contract, as of markitdown's sample plugin:

1. **Entry-point group**: `markitdown.plugin`.
2. **Module exports**: `__plugin_interface_version__` (int) and `register_converters(markitdown, **kwargs)` (callable).
3. **Registration method**: `markitdown.register_converter(converter_instance[, priority=...])`.
4. **Converter contract**: subclass `DocumentConverter`, implement `accepts()` and `convert()` with the documented `(file_stream, stream_info, **kwargs)` signature.

Any breaking change to items 2–4 → bump to v2.

## When not to use this

For plugin systems whose surface is small and stable (one function, one data shape), the version constant is ceremony. Reserve it for hosts where:

- The plugin API is big enough to actually break.
- You expect a long tail of third-party plugins you don't control.
- You want to ship v2 before deleting v1.

## Related

- `python-entrypoint-plugin-loader` skill — the broader loader pattern this constant plugs into.
- Any semver-for-libraries discussion — but note: `__plugin_interface_version__` is narrower, covering only the host contract, not the plugin's own API surface.
