---
description: Browse and install examples from kjuhwa/skills.git into the current project directory
argument-hint: [keyword] [--list] [--stack=<name>] [--open]
---

# /hub-install-example $ARGUMENTS

Install example projects from the central repository into the current working directory.

## Steps

1. **Ensure remote cache exists**
   - Path: `~/.claude/skills-hub/remote/`
   - If missing: `git clone https://github.com/kjuhwa/skills.git ~/.claude/skills-hub/remote` (full clone).
   - If present and older than 1h: `git -C ~/.claude/skills-hub/remote fetch --tags --prune origin && git -C ~/.claude/skills-hub/remote reset --hard origin/main`.

2. **Scan available examples**
   - **MUST use `main` branch (HEAD) only.** Never install from `example/*` feature branches — they may contain outdated or unmerged versions. Always read from the `main` checkout of the remote cache.
   - Scan `example/**/manifest.json` files from the remote cache at `main` HEAD (recursive — examples may be nested under category subdirectories like `example/hub-tools/auto-hub-loop/`).
   - Build a list: `slug`, `title`, `stack[]`, `created_at`.
   - If no `manifest.json` exists for an example dir, infer slug from directory name and mark stack as `unknown`.

3. **Filter**
   - If `$ARGUMENTS` contains `--list` (no keyword): show all examples as a numbered table and stop.
   - If keyword provided: match against `slug`, `title`, and `stack[]` (case-insensitive, substring match).
   - If `--stack=<name>` flag present: also filter by stack array containing that value.

4. **Present matches**
   - Show a numbered list:
     ```
      #  Slug                          Stack                Created
      1  circuit-breaker-dashboard     html, css, vanilla-js  2026-04-16
      2  backpressure-pipeline         html, css, vanilla-js  2026-04-16
     ```
   - If zero matches: list all available slugs and stop.
   - If exactly 1 match: auto-select it, show details and confirm.

5. **Ask user** which to install (accept number, slug name, `all`, or `cancel`).

6. **Install selected example(s)**
   - Destination: `./<slug>/` in the current working directory.
   - If destination already exists: warn and ask overwrite / skip / rename.
   - Copy the entire `example/<slug>/` directory from the remote cache to the destination.
   - Preserve directory structure (some examples have subdirectories like `browser/`).

7. **Post-install**
   - Show the installed file list.
   - If `--open` flag present AND `index.html` exists in the installed example: open it in the default browser (`start` on Windows, `open` on macOS, `xdg-open` on Linux).
   - Print: `Installed <slug> → ./<slug>/`

## Examples

```bash
# List all available examples
/hub-install-example --list

# Search by keyword
/hub-install-example dashboard

# Filter by stack
/hub-install-example --stack=react

# Install and open in browser
/hub-install-example circuit-breaker-dashboard --open

# Install multiple
/hub-install-example pipeline
```

## Rules

- **Always install from `main` branch HEAD.** Never use `example/*` feature branches — they may contain outdated or unmerged content. All installation sources must come from the `main` checkout.
- **Read-only on remote cache.** Copy files out; never modify the cache.
- Never install without explicit user confirmation unless only 1 exact-slug match.
- If the example contains a `package.json`, remind the user to run `npm install` after installation.
- Do NOT modify any installed files — deliver them exactly as they exist in the remote.
- If `$ARGUMENTS` is empty, behave as `--list`.
