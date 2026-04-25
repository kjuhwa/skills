---
version: 0.1.0-draft
name: bash-lc-single-quote-cron-keepalive
summary: When scheduling a long-running node loop from cron, pm2, or any other runner that serialises the command string through several escape layers, wrap the whole payload as `bash -lc 'node index.js --loop'` — one set of single quotes, no composition, no `; echo EXIT:$?` tails, to avoid nested-quote breakage.
category: reference
tags: [cron, pm2, shell-quoting, keepalive, daemon, gotcha]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 4c51382092f9cb125d3ec55475861ead8d1463a6
source_project: evolver
source_paths:
  - README.md (Cron / External Runner Keepalive section)
imported_at: 2026-04-18T03:00:00Z
---

# `bash -lc '…'` Pattern for Cron-Scheduled Loops

Cron entries, pm2 configs, Kubernetes `command: []` arrays, and shell-agent runners all serialize the command string through multiple escape layers. Every extra bit of punctuation is another chance for a quote mismatch.

## Recommended form

```bash
bash -lc 'node index.js --loop'
```

One outer command, one pair of single quotes, no inner composition.

## pm2 example (same principle)

```bash
pm2 start "bash -lc 'node index.js --loop'" --name evolver --cron-restart="0 */6 * * *"
```

Outer double quotes (pm2 spec); inner single quotes (the script); no further nesting.

## What NOT to do

```bash
# BAD — the trailing segment breaks after one or two re-escape passes:
bash -lc 'node index.js --loop; echo EXIT:$?'

# BAD — mixing quotes is a quote-mismatch landmine:
bash -c "node index.js --loop && tail -f ./memory/evolver.log"
```

## Why `-l` (login shell)

`-l` sources the user's login rc files so `PATH` contains `~/.nvm/**` or `~/.npm-global/bin`. Without it, cron environments often can't find `node` at all, producing silent "command not found" and no useful exit code.

## Rule of thumb

If the runner wants one string, give it one string. The moment you're tempted to add `;` / `&&` / `$?` inside, stop — move that logic into a small shell script on disk and invoke *that* from cron.
