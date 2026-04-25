---
version: 0.1.0-draft
name: sandbox-soft-vs-hard-trade-off
summary: OpenSRE's Python sandbox is a "soft" sandbox — monkeypatching socket/subprocess/open at the start of an injected preamble. Sufficient for the SRE agent threat model (LLM-generated diagnostic snippets), insufficient for adversarial code; understand the boundary.
category: safety
tags: [sandbox, threat-model, security, llm-generated-code]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/sandbox/runner.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
---

# Sandbox Trade-offs — Soft vs Hard

## The threat model
OpenSRE's sandbox runs LLM-generated Python snippets that an SRE agent uses to compute things from evidence (e.g. parse a CloudWatch log JSON, compute percentiles). The threat is **buggy or hallucinated code accidentally exfiltrating data or modifying the system**, not a determined adversary.

For this threat model, a "soft" sandbox is appropriate:
- Monkeypatch `socket.socket`, `socket.create_connection`, `socket.getaddrinfo` to raise `PermissionError` — blocks ALL network including DNS, HTTP, gRPC.
- Monkeypatch `subprocess.{Popen,call,check_call,check_output,run}`, `os.system`, `os.popen` — blocks shell escape.
- Monkeypatch `builtins.open` to allow reads anywhere but reject writes outside `/tmp` and the platform tempdir.
- `subprocess.run(timeout=N)` provides wall-clock cap; the `MAX_TIMEOUT` constant clamps caller-supplied timeouts.

## What this DOES NOT protect against
- `ctypes.CDLL("libc.so.6")` — direct syscalls bypass Python-level patches.
- C extensions that hold their own `socket` reference cached at import time.
- `os.fork()` + escape via parent's untouched module references.
- Reading sensitive files (process is allowed read-anywhere).
- Memory exhaustion (no rlimit).

## When you NEED hard sandboxing
- User-uploaded code (web IDE, notebook hosting).
- Multi-tenant code execution.
- Code from untrusted training data (some agent benchmarks).

For those, use OS-level isolation:
- **gVisor** — userland kernel; works with Docker.
- **Firecracker** — microVMs; AWS Lambda's runtime.
- **Wasm** (Pyodide, RustPython→Wasm) — language-level isolation.
- **seccomp-bpf** — syscall filtering; available on Linux.

## OpenSRE's choice
The trade-off makes sense because:
- Code source is OpenSRE's own LLM (controlled) plus user-defined SRE runbooks (semi-trusted).
- A determined attacker bypassing the sandbox already has access to send arbitrary alerts to the agent.
- The cost of running gVisor for every diagnostic snippet would dominate the agent's latency budget.

## Lesson
Always document your sandbox's threat model explicitly. "We use a sandbox" without "for X threat model" creates a false sense of security that will eventually bite.
