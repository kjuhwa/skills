# Calling `claude` CLI From a JVM App via a Node Wrapper

## Problem
You want a Spring Boot / Java service to invoke the `claude` CLI (`claude -p <prompt> --output-format text`) as a subprocess. A direct `ProcessBuilder` call that inherits stdin or leaves it closed often **hangs indefinitely** — the CLI waits for a newline / EOF that never arrives when launched from a JVM without a controlling terminal.

Piping `echo "" | claude -p ...` in a bash script works locally but is painful to orchestrate from Java: cross-platform quoting, shell selection, stdin plumbing, and buffer-size limits all surface.

## Pattern

Delegate the subprocess invocation to a ~15-line Node.js wrapper that handles stdin correctly via `child_process.execFileSync` with `input: '\n'`. Java launches Node, Node launches Claude.

### `claude-runner.js`

```js
const { execFileSync } = require('child_process');
const fs = require('fs');

const promptFile = process.argv[2];
const prompt = fs.readFileSync(promptFile, 'utf-8');

try {
  const result = execFileSync('claude', ['-p', prompt, '--output-format', 'text'], {
    input: '\n',                      // <-- the critical bit
    encoding: 'utf-8',
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024,
  });
  process.stdout.write(result);
} catch (e) {
  if (e.stdout) process.stdout.write(e.stdout);
  else process.stderr.write(e.message);
  process.exit(1);
}
```

### Java side

```java
Path promptFile = Path.of(workDir, "_prompt.txt");
Files.writeString(promptFile, prompt);
try {
    String runner = promptFile.getParent().resolve("claude-runner.js").toAbsolutePath().toString();
    ProcessBuilder pb = new ProcessBuilder(
        "node", runner, promptFile.toAbsolutePath().toString());
    pb.redirectErrorStream(true);
    Process p = pb.start();
    String out = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
    int exit = p.waitFor();
    if (exit != 0) throw new RuntimeException("claude failed: " + out);
    return out;
} finally {
    Files.deleteIfExists(promptFile);
}
```

Why the prompt is passed via a **file**, not an argv string:
- Cross-OS argv length limits (Windows cmd: ~8k, exec(): 128k).
- Quoting hell for prompts with newlines, backticks, `"`, `$`.
- Easier debugging — the temp file can be inspected during a hang.

## When to use

- Server-side LLM pipelines where the API is the `claude` CLI (not the Anthropic REST SDK) — e.g. reusing a logged-in CLI session, local dev without an API key.
- Prototypes that later migrate to the SDK: the wrapper is a thin abstraction seam.
- Any language-to-CLI bridge where the CLI expects stdin that a parent process can't easily provide (pytest subprocess, Go `exec.Cmd`, etc.).

## Pitfalls

- **Prefer the Anthropic SDK for production**: subprocess-out-to-CLI is fine for dev/demo but not for production — you lose structured error handling, retries, streaming, and token accounting. The `@anthropic-ai/sdk` or `anthropic` Python SDK over HTTPS is the durable path.
- **`node` and `claude` must be on PATH** when the JVM starts. Spring Boot as a service often has a minimal PATH — pass `pb.environment().put("PATH", ...)` or use absolute paths.
- **Timeouts must exist at every layer**: Node's `execFileSync timeout`, Java's `Process.waitFor(timeout, unit)`, and an outer request-level timeout. Without them, a stalled CLI starves the thread pool.
- **maxBuffer**: Node's default `maxBuffer` is ~1 MB — enough to truncate long model outputs. Bump to 10 MB+ or use streaming (`spawn` + stream).
- **Windows path gotchas**: Windows paths with spaces must be quoted; avoid paths with `&` or `%`. Prefer forward slashes in Java `Path.of` — they work cross-platform.
- **Temp file cleanup**: use try/finally and `deleteIfExists`; don't rely on JVM shutdown hooks for per-request temp files.
- **Concurrency**: the CLI holds per-process state. Don't assume two concurrent `claude-runner.js` invocations are independent if they share a config dir — test under load.
