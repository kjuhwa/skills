---
name: python-sandbox-block-network-and-subprocess
description: Run untrusted Python code in a subprocess with a preamble that monkeypatches socket, subprocess, os.system, and builtins.open to block network, shell, and writes outside /tmp; capture stdout/stderr with a hard timeout.
category: safety
version: 1.0.0
version_origin: extracted
tags: [sandbox, untrusted-code, subprocess, security]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/sandbox/runner.py
imported_at: 2026-04-18T00:00:00Z
---

# Python Sandbox: Block Network / Subprocess / Writes

## When to use
The agent generates Python code (e.g. data analysis snippets) that needs to run on the host but must NOT make network calls, spawn subprocesses, or write outside the temp directory. Pure-Python sandboxing is enough for the SRE agent threat model: a malicious LLM-generated script must not exfiltrate data or modify the system.

## How it works
- A constant `_SANDBOX_PREAMBLE` is prepended to user code. It rebinds `socket.socket`, `socket.create_connection`, `socket.getaddrinfo`, `subprocess.{Popen,call,check_call,check_output,run}`, `os.system`, `os.popen` to a function that raises `PermissionError`.
- `builtins.open` is replaced with a wrapper that allows reads anywhere but rejects writes outside `/tmp` and the platform tempdir.
- The combined script is written to a `NamedTemporaryFile` and executed via `subprocess.run(timeout=...)` with a hard cap (`MAX_TIMEOUT = 60`).
- Inputs are JSON-injected as a global `inputs` dict so the user code can consume structured data.

## Example
```python
_SANDBOX_PREAMBLE = textwrap.dedent("""\
    import socket as _socket_module
    import builtins as _builtins_module
    import os as _os_module
    import tempfile as _tempfile_module

    class _BlockedSocket:
        def __init__(self, *args, **kwargs):
            raise PermissionError("Network access is not permitted in sandbox mode")
    _socket_module.socket = _BlockedSocket
    _socket_module.create_connection = lambda *a, **k: (_ for _ in ()).throw(
        PermissionError("Network access is not permitted in sandbox mode"))

    _ALLOWED_WRITE_ROOTS = (
        _os_module.path.realpath(_tempfile_module.gettempdir()),
        _os_module.path.realpath(_os_module.sep + "tmp"),
    )
    _original_open = _builtins_module.open
    def _restricted_open(file, mode="r", *a, **k):
        if isinstance(file, (str, bytes)) or hasattr(file, "__fspath__"):
            if any(c in str(mode) for c in ("w", "a", "x")):
                abs_path = _os_module.path.realpath(_os_module.fspath(file))
                if not any(abs_path.startswith(root) for root in _ALLOWED_WRITE_ROOTS):
                    raise PermissionError(f"Write access denied: {file}")
        return _original_open(file, mode, *a, **k)
    _builtins_module.open = _restricted_open

    import subprocess as _sp
    _sp.Popen = _sp.call = _sp.check_call = _sp.check_output = _sp.run = (
        lambda *a, **k: (_ for _ in ()).throw(
            PermissionError("Subprocess execution is not permitted in sandbox mode")))
""")

def run_python_sandbox(code, inputs=None, timeout=30):
    full_code = _SANDBOX_PREAMBLE + _inject_inputs(inputs) + code
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as tmp:
        tmp.write(full_code); path = tmp.name
    try:
        result = subprocess.run([sys.executable, path], capture_output=True,
                                text=True, timeout=min(max(1, timeout), 60))
        return SandboxResult(...)
    except subprocess.TimeoutExpired:
        return SandboxResult(timed_out=True, ...)
```

## Gotchas
- This is a **soft** sandbox. A determined attacker can still load C extensions or use `ctypes` to bypass the Python-level patches. Use OS-level sandboxing (seccomp, gVisor, Firecracker) for adversarial inputs.
- Always delete the temp script in a `finally` block; orphaned scripts leak through Docker layers.
- Cap timeout at the upper bound (`MAX_TIMEOUT`) before passing to `subprocess.run` so untrusted code can't ask for an hour-long run.
- Inputs are JSON-encoded; don't pass non-serializable objects (datetimes, custom classes).
