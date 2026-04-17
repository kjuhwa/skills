---
name: stdin-redirect-cli-large-prompts
description: Pipe large prompts to CLI tools via temp file + shell redirect to bypass argv length limits and stdin propagation issues
category: workflow
triggers:
  - ENAMETOOLONG spawn
  - large prompt cli
  - claude -p long input
  - argv too long
  - stdin propagation
tags:
  - cli
  - ipc
  - workflow
  - shell
  - cross-platform
version: 1.0.0
---

# Stdin Redirect for Large CLI Prompts

When piping a large text payload (>30KB) into a CLI tool, neither direct argv nor Node's stdin pipe reliably work cross-platform. The robust pattern is: write to a temp file, then spawn the CLI via shell with input-redirect `< file.txt`.

## The three failing approaches

**❌ Direct argv**
```js
execFile('claude', ['-p', longPrompt])
```
Fails with `ENAMETOOLONG` on Windows (32 KB argv limit) and Linux (~128 KB).

**❌ Node stdin pipe**
```js
const child = spawn('claude', ['-p'], { stdio: ['pipe', ...], shell: true });
child.stdin.write(longPrompt); child.stdin.end();
```
On Windows with `shell: true`, Node spawns `cmd.exe` which spawns the CLI. The stdin pipe terminates at `cmd.exe`, not the child — the CLI waits on an empty stdin and times out.

**❌ Node stdin pipe without shell**
```js
spawn('claude', ['-p'], { shell: false })
```
On Windows this can't find `claude` — npm CLIs ship as `claude.cmd` which the non-shell spawn doesn't resolve. Workarounds (using `claude.cmd` directly) are brittle.

## The working approach

Write to a temp file, then use shell redirect:

```js
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

async function askCli(prompt, timeout = 900000) {
  const tmpFile = path.join(os.tmpdir(), `prompt-${Date.now()}-${Math.random().toString(36).slice(2,8)}.txt`);
  fs.writeFileSync(tmpFile, prompt, 'utf8');
  const fSlash = tmpFile.replace(/\\/g, '/');
  const cmd = `claude -p < "${fSlash}"`;

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, [], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => { child.kill(); cleanup(); reject(new Error('timeout')); }, timeout);
    const cleanup = () => { try { fs.unlinkSync(tmpFile); } catch {} };
    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());
    child.on('close', code => {
      clearTimeout(timer); cleanup();
      if (code !== 0) reject(new Error(`exit ${code}: ${stderr.split('\n')[0]}`));
      else resolve(stdout.trim());
    });
  });
}
```

## Why it works

- Shell handles `< file.txt` — the OS kernel opens the file and sets it as stdin for the child. Works identically on bash and cmd.exe.
- `stdio: ['ignore', ...]` — no stdin pipe from Node, avoids the cmd.exe stdin propagation bug.
- Path forward-slashes — both Windows `cmd.exe` (via shell in git-bash on Windows) and POSIX shells accept them.
- Temp file is cleaned in every exit path (timeout, error, close).

## When to use

- LLM CLI tools with prompts >30KB (Claude CLI, ollama, etc.)
- Any CLI that accepts input via stdin when argv would overflow
- Batch-processing pipelines where prompt templates grow with included context

## Gotchas

- **Race condition**: if two calls happen in the same millisecond, include a random suffix in the temp filename
- **Special characters in path**: quote the filename (`"..."`), avoid spaces if possible — use `os.tmpdir()` rather than user-chosen dirs
- **Timeout budget**: redirect + large prompt + model generation can easily take 10+ minutes; default timeouts (60s) are too short
