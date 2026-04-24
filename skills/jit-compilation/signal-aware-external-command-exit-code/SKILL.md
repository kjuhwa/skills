---
name: signal-aware-external-command-exit-code
description: Wrap `popen`/`pclose` so that a child killed by Ctrl+C (SIGINT) returns a non-zero code (`128 + sig`) instead of silently succeeding — because `WEXITSTATUS` returns 0 on signal-terminated processes.
category: jit-compilation
version: 1.0.0
version_origin: extracted
tags: [popen, subprocess, signal-handling, error-handling, waitstatus, posix]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/deepseek-ai/DeepGEMM.git
source_ref: main
source_commit: 7f2a703ed51ac1f7af07f5e1453b2d3267d37d50
source_project: DeepGEMM
source_paths:
  - csrc/utils/system.hpp
imported_at: 2026-04-18T13:30:00Z
---

# Signal-Aware Exit Code From `popen` / `pclose`

## When to use
Your JIT invokes external tools (`nvcc`, `cuobjdump`) via `popen`. You check the return code to decide whether compilation succeeded. But if the user hits Ctrl+C during a 30-second NVCC invocation, `pclose` returns a `wait(2)`-style status, and `WEXITSTATUS(status)` returns 0 for signal-killed processes. Your code thinks the compile succeeded with empty output. Subsequent cache loads fail mysteriously.

## Steps
1. **Redirect stderr to stdout** so you capture both streams in one pipe:
   ```cpp
   command = command + " 2>&1";
   ```
2. **Use RAII around `pclose`** so the pipe closes even if the output-read throws:
   ```cpp
   const auto deleter = [](FILE* f) { if (f) pclose(f); };
   std::unique_ptr<FILE, decltype(deleter)> pipe(popen(command.c_str(), "r"), deleter);
   DG_HOST_ASSERT(pipe != nullptr);
   ```
3. **Accumulate output with a fixed-size buffer.** 512 bytes is plenty for each `fgets` tick:
   ```cpp
   std::array<char, 512> buffer;
   std::string output;
   while (fgets(buffer.data(), buffer.size(), pipe.get()))
       output += buffer.data();
   ```
4. **Release the pipe before `pclose`** (so we get the raw int status, not the RAII-managed one):
   ```cpp
   const auto status = pclose(pipe.release());
   ```
5. **Decode the status with both `WIFEXITED` and `WTERMSIG`:**
   ```cpp
   const auto exit_code = WIFEXITED(status)
       ? WEXITSTATUS(status)
       : 128 + WTERMSIG(status);
   ```
   - If the child exited normally, use `WEXITSTATUS`.
   - If the child died from a signal (e.g., `SIGINT` from Ctrl+C), synthesize `128 + sig` — the shell convention. Ctrl+C → `128 + 2 = 130`. This is non-zero so your caller treats it as failure.
6. **Return `{exit_code, output}`.** Every caller branches on `exit_code != 0` and prints the output as an error message.

## Evidence (from DeepGEMM)
- `csrc/utils/system.hpp:35-50`: the full `call_external_command`. The comment block on line 46-48 is explicit:
  ```cpp
  // NOTES: if the child was killed by a signal (e.g., SIGINT from Ctrl+C),
  // WEXITSTATUS would incorrectly return 0. Treat signal death as failure.
  ```
- `csrc/jit/compiler.hpp:224-229`: NVCC call site — checks `return_code != 0`, prints output, then asserts. Without the signal handling, Ctrl+C during compilation leaves a corrupt cache entry and a spurious success log.

## Counter / Caveats
- **POSIX-only.** Windows has no `popen` with signal semantics — use `_spawnvp` + `GetExitCodeProcess`.
- **`128 + sig` collides with real exit codes 128-255.** If a program legitimately exits with 130, you can't distinguish it from `SIGINT`. Acceptable for tool invocations (NVCC doesn't use codes >= 128), risky for arbitrary subprocesses.
- **`DG_HOST_ASSERT(pipe != nullptr)` will throw** — which is why you want the RAII deleter *outside* the assert chain so the pipe does close even on throw paths.
- **Output buffer unbounded.** A 100 MB NVCC dump will balloon `output`. Cap it (e.g., tail-last-1MB) for user-output commands.
