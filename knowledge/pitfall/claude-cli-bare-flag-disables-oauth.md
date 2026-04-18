---
version: 0.1.0-draft
name: claude-cli-bare-flag-disables-oauth
description: "`claude -p --bare` returns exit 1 with empty stderr when the user is OAuth-authenticated — `--bare` explicitly disables OAuth and keychain reads."
category: pitfall
source:
  kind: session
  ref: "session-20260418-0215"
confidence: high
linked_skills:
  - claude-cli-subprocess-adapter
tags:
  - claude-cli
  - authentication
  - oauth
  - subprocess
  - flag-trap
---

# `--bare` flag disables OAuth auth in `claude -p`

## Symptom

`claude -p --bare --model ... --output-format text` returns exit code `1` with an **empty stderr**. The same invocation without `--bare` works fine on the same machine with the same user session.

## Root cause

The `--bare` flag explicitly disables OAuth and keychain reads. From `claude --help`:

> `--bare`: Minimal mode: skip hooks, LSP, plugin sync, attribution, auto-memory, background prefetches, keychain reads, and CLAUDE.md auto-discovery. Sets `CLAUDE_CODE_SIMPLE=1`. **Anthropic auth is strictly `ANTHROPIC_API_KEY` or `apiKeyHelper` via `--settings` (OAuth and keychain are never read).**

So if the user is authenticated via `claude login` (OAuth, token in keychain) and there's no `ANTHROPIC_API_KEY` in the environment, `--bare` forces the CLI into an unauthenticated path where it exits immediately with no stderr.

## Why the silent failure matters

In a subprocess wrapper that captures stderr and only surfaces it on non-zero exit, you get `"claude CLI exit 1: (no stderr)"` — which looks like a mysterious CLI bug or a prompt-parsing error, not an auth problem. Expect to burn 10+ minutes chasing the wrong hypothesis.

## Decision rule

| Situation | Use `--bare`? |
|---|---|
| User authenticates via OAuth / `claude login` | **No** |
| You explicitly set `ANTHROPIC_API_KEY` and want hermetic runs | Yes |
| You want to skip plugin sync / auto-memory / hooks noise in long-running loops | Yes, but export `ANTHROPIC_API_KEY` first |

## Debug checklist when `claude -p` exits with empty stderr

1. Remove `--bare` and retry — if it works, this was the cause
2. Check `env | grep ANTHROPIC` — if `ANTHROPIC_API_KEY` is missing and `--bare` is set, that's it
3. If still failing, try `claude -p --debug` (without `--bare`) for a fuller error trace
