---
name: claude-cli-unattended-wrapper
description: Spawn `claude -p` non-interactively from a Node parent process so a long-running loop can drive slash commands without any human at the keyboard. Layers a prompt tempfile, a piped "y\n" stream, hook-bypass env vars, and a stream-json consumer to keep the child from ever blocking.
category: operations
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [claude-code, cli, unattended, automation, spawn, stdin, stream-json, loop]
source_type: extracted-from-project
source_project: trending-hub-loop
imported_at: 2026-04-18T00:00:00Z
---

# Claude CLI Unattended Wrapper

## When to use

You are running `claude -p "<slash command>"` from inside another process (daemon, pipeline, scheduled loop) and cannot have any interactive prompt — selection menu, "Proceed? [y/N]", permission ask — deadlock the child.

## Shape (five concerns, each addressed separately)

| Concern | Fix |
|---|---|
| Prompt too long for argv | Write prompt to a tempfile; `cat` it into `claude -p`'s stdin |
| Interactive "y/N" mid-run | Append a file of `y\n` × 10 to the same pipe; any blocking read gets answered |
| Slash-command own selection UI | Use its native `--yes` / non-interactive flag first; stdin is the safety net |
| Permission prompt on tool use | `--dangerously-skip-permissions` (the parent *must* accept the blast radius) |
| Parent hooks hijacking I/O | Env vars that tell the wrapping harness to stay out of this child's I/O |

## Reference invocation (Node, cross-platform)

```js
const tmp    = path.join(os.tmpdir(), `prompt-${Date.now()}.txt`);
const yesTmp = path.join(os.tmpdir(), `yes-${Date.now()}.txt`);
fs.writeFileSync(tmp, promptText, 'utf8');
fs.writeFileSync(yesTmp, 'y\n'.repeat(10), 'utf8');

// `cat` exists on both git-bash/WSL on Windows and on *nix. Avoid `type` because
// it mangles line endings and doesn't concat two files in a single stream.
const cmd =
  `cat "${tmp}" "${yesTmp}" | claude -p ` +
  `--dangerously-skip-permissions --output-format stream-json --verbose`;

const child = spawn(cmd, [], {
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, DISABLE_OMC: '1', OMC_SKIP_HOOKS: '*', CLAUDE_DISABLE_SESSION_HOOKS: '1' },
});
```

## Rules

- **Prompt via stdin, not argv.** Argv length limits (≈32KB on Windows, ≈128KB on Linux) will bite once prompts include embedded URLs or context. Tempfile + pipe sidesteps it entirely and also dodges shell quote-escaping bugs.
- **Concatenate the auto-yes file onto the same pipe.** Two separate `echo y` commands won't reach a child that only reads stdin once; a single `cat promptFile yesFile |` gives one continuous stream.
- **Always set a timeout.** A stuck child can silently hold the pipeline forever. 30 min is a reasonable outer bound for a single slash command; anything longer is a bug. `setTimeout(() => child.kill(), timeoutMs)` then clean up on close.
- **Clean the tempfiles in the close handler.** Both the happy path and the error path must `unlinkSync` the two tempfiles — otherwise `/tmp` fills up in loops that run thousands of times a day.
- **Use `--output-format stream-json --verbose`.** That way the parent can parse each assistant message, tool_use, and result event line-by-line instead of waiting for the whole transcript. Pair it with a stream-json consumer (see linked skill).
- **Phrase the prompt to pre-answer everything.** Even with the stdin safety net, the prompt itself should spell out: "answer 'y' to any interactive prompt", "if asked to select, choose 'all'", "do not ask me any follow-up questions". Belt *and* suspenders.

## Counter / Caveats

- `--dangerously-skip-permissions` is exactly what the name says. The child can run arbitrary `git clone`, `rm`, `curl`, etc. Accept this only if the parent has already fenced the child: scoped working dir, no production credentials in env, outbound network confined.
- On Windows, `cat` is only present if git-bash or WSL is installed. PowerShell's `cat` is an alias for `Get-Content` which prints with CRLF and differs in concat behavior — don't use it. If you must run from pure cmd.exe, shell out via `bash -c "..."`.
- The `y\n` stream answers anything that reads from stdin, which means you also auto-confirm destructive prompts you didn't anticipate. Audit the slash commands you run for any "really delete? [y/N]" paths before enabling this in production.
- Hook-bypass env vars are specific to the OMC harness. If the parent is plain shell, they're no-ops — but costless. See linked knowledge entry.

## Related

- Knowledge: `claude-cli-hook-bypass-envs` — why those three env vars matter and what each turns off.
- Knowledge: `dangerously-skip-permissions-for-unattended-loops` — risk accounting for the permission bypass.
- Skill: `stream-json-assistant-event-router` — how to consume the child's `--output-format stream-json` output.
