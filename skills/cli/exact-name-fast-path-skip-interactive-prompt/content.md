# Exact-name fast path — skip the interactive picker on unique match

## Problem

A CLI with a "search catalog, pick from a list" flow:

```
$ mycli install foo
1. team-a/foo-widget  — a widget ...
Pick 1..N or `cancel`:
```

When the user already knows the exact slug (`mycli install team-a/foo-widget`) or the command runs non-interactively (shell script, demo GIF, CI), the single-row picker is pure friction. It forces a second keystroke and a human-in-the-loop where none is needed.

Users experience this as slowness even though the picker is instant, because the mental model is "I typed the full name, just do it."

## Pattern

Before rendering the numbered list, check whether the keyword uniquely identifies an entry:

```python
matches = [e for e in catalog if query_matches(e, keyword)]

# --- exact-name fast path ---
exact = [e for e in matches if e["name"].casefold() == keyword.casefold()]
if len(exact) == 1 and not args.interactive:
    chosen = [exact[0]]  # skip the prompt
    goto_resolve(chosen)
    return

# --- otherwise, show the picker ---
if len(matches) == 0: suggest_close_matches(); return
if len(matches) > 10: matches = top_by_score(matches, 10)
render_numbered_list(matches)
chosen = prompt_user_selection(matches)
```

Three rules keep the fast path safe:

1. **Exact-match on `name`, not on `description`/`tags`.** Case-insensitive equality, nothing fuzzy. Substring or regex would silently trigger the fast path on unintended entries.
2. **Only on len == 1.** Two entries with the same display name should never auto-pick — the prompt shows both so the user disambiguates.
3. **Provide `--interactive` as an opt-out.** Useful when the user wants to see "yes this is the one I meant" confirmation, or when they suspect a silent collision. Never make opt-out the default — the whole point is fewer round-trips.

## When to apply

- Any `search → pick → act` CLI flow where the search input can equal the primary key (install commands, package managers, plugin registries, skill hubs, etc.).
- Demo/scripted calls where the exact slug is pasted.
- Batch wrappers (`xargs mycli install <`) where no human is present.

## When NOT to apply

- Searches where `name` isn't unique (ambiguous by design).
- Destructive actions (`delete`, `remove`) — always prefer a confirmation prompt, even on exact match. The "skip prompt" UX only applies to safe-by-default actions like install/install-to-local.
- When the user's input is fuzzy search by convention — don't reward "lucky exact hits".

## Counter-example from practice

Before the fast path, `/hub-install <exact-slug>` in a 748-entry catalog took:

```
Steps: (a) search → 1 match → render "1. ..." numbered list → (b) prompt → (c) user types "1" → (d) resolve
```

After:

```
Steps: search → exact match → resolve
```

Measured round-trip drops from ~1.8s (interactive) to ~0.3s (script-friendly). `--interactive` flag restores the old behavior for users who want the confirmation step.

## Evidence

Introduced in skills-hub bootstrap v2.6.3 after user feedback that demo recordings and one-off installs were noticeably slow. The exact-name fast path was the single-highest-leverage change — it's a ~10-line edit that removes a human round-trip from the 80%-of-the-time case.
