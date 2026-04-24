---
description: Unified local-state list (skills + knowledge + techniques + examples). Supersedes /hub-list-skills, /hub-list-knowledge, /hub-list-examples.
argument-hint: [--kind skills|knowledge|techniques|examples|all] [--category <cat>] [--tag <tag>]
---

# /hub-list $ARGUMENTS

One entry point for "what's installed locally?". Delegates to the specialised flows based on `--kind`.

## Dispatch

| `--kind` | Delegates to |
|---|---|
| `all` *(default)* | Run `/hub-list-skills`, `/hub-list-knowledge`, and `/hub-technique-list` flows, render a combined table with a `KIND` column. Examples are NOT included by default (they're remote-only previews — see below). |
| `skills` | `/hub-list-skills` flow. |
| `knowledge` | `/hub-list-knowledge` flow (filters `--tag`, `--linked-to`, `--orphans` all apply). |
| `techniques` | `/hub-technique-list` flow (middle-layer composition recipes — scans `~/.claude/techniques/**/TECHNIQUE.md` and project-local `./.technique-draft/`). |
| `examples` | `/hub-list-examples` flow (remote example projects — not local installs). |

## Steps

1. Parse `--kind`. Default `all`.
2. Parse downstream filters (`--category`, `--tag`) and pass through to the chosen flow.
3. Execute the delegated flow and print its output. For `all`, render a combined table:
   ```
   KIND       | CATEGORY | NAME                       | SOURCE       | SCOPE
   skill      | backend  | kafka-avro-producer-gzip   | v1.2.0       | global
   knowledge  | pitfall  | kafka-consumer-hostname... | high         | (n/a)
   ```
4. End-of-output summary: `<N> skills, <M> knowledge, <T> techniques installed` (and examples count if included).

## Why exists

Previously three commands (`/hub-list-skills`, `/hub-list-knowledge`, `/hub-list-examples`) solved the same question — "what's in my hub". Users routinely had to remember which to invoke. Since v2.6.0 this is the canonical entry; the originals remain as thin aliases for backward compatibility.

## Rules

- **No remote fetch**: purely local state. For remote discovery use `/hub-find`.
- Output is stable column-aligned text — LLMs can parse.
- When `--kind all` finds zero entries, print the "nothing installed" summary of the underlying commands.
