# skills-hub

> **Skill & knowledge registry for Claude Code** — 467 reusable skills + 351 knowledge entries + 2 composition techniques + 28 example projects you can install into any project with a single slash command.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Bootstrap](https://img.shields.io/github/v/tag/kjuhwa/skills-hub?filter=bootstrap/v*&label=bootstrap&color=purple)](https://github.com/kjuhwa/skills-hub/tags)
[![Skills](https://img.shields.io/badge/skills-467-blue)](./index.json)
[![Knowledge](https://img.shields.io/badge/knowledge-351-green)](./knowledge)
[![Techniques](https://img.shields.io/badge/techniques-2-teal)](./technique)
[![Examples](https://img.shields.io/badge/examples-28-orange)](./example)
![GitHub last commit](https://img.shields.io/github/last-commit/kjuhwa/skills-hub)
![GitHub stars](https://img.shields.io/github/stars/kjuhwa/skills-hub?style=social)

Stop re-deriving the same patterns in every Claude Code session. `skills-hub` is a curated, versioned catalog of battle-tested skills and domain knowledge — searchable, installable, and extractable — so your agent starts every project already knowing what worked last time.

![hub-find → hub-install → hub-list → hub-doctor](./docs/demo-hub-find.gif)

<details><summary>▶ <b>Full 60s walkthrough — Core 8 tour</b></summary>

![Core 8 walkthrough](./docs/demo-core-8.gif)

</details>

```bash
# One-line install into ~/.claude
curl -fsSL https://raw.githubusercontent.com/kjuhwa/skills-hub/main/bootstrap/install.sh | bash

# Then in any Claude Code session
/hub-find  "스프링 카프카"        # ranked search, KO↔EN synonyms
/hub-install <name>               # install a specific skill
/hub-extract                      # mine this repo for new skills
/hub-publish                      # ship drafts back (skills + knowledge in one PR)
```

**Highlights**
- ✨ **Core 8 mental model (v2.6.0+)** — 35 commands reduced to 8 canonical entry points: `/hub-find`, `/hub-suggest`, `/hub-install`, `/hub-list`, `/hub-extract`, `/hub-publish`, `/hub-sync`, `/hub-doctor`. Legacy names still work as aliases.
- ⚡ **Fast bulk scans via Explore subagent (v2.6.1+)** — scan-heavy commands (`/hub-import`, `/hub-extract`, `/hub-refactor`, `/hub-condense`, `/hub-cleanup`, `/hub-research`) delegate bulk file/web scanning to an isolated subagent. Typical run drops from ~70 tool calls to ~5.
- 🔎 **Ranked search with KO↔EN synonyms** — `/hub-find "스프링 카프카"` scores `name`/`description`/`tags`/`triggers` and expands 180+ Korean/English synonyms (v2.5.0+).
- 🚦 **Blocking pre-implementation hub check (v2.6.10+, tightened v2.6.12+)** — a `UserPromptSubmit` hook scans for implementation intent (KO 구현해/만들어/작성해/짜줘/개발해/추가해 + EN implement/build/create/develop/scaffold/write a) and a `PreToolUse` gate refuses the first `Write`/`Edit`/`MultiEdit`/`NotebookEdit` until a hub search actually runs (cleared by `hub-search` / `/hub-find` / `/hub-install` / `/hub-list`). `/hub-suggest` stays as the manual entry point. Opt out: `SKILLS_HUB_NO_AUTO_SUGGEST=1`.
- 🧰 **Zero-friction installer (v2.6.7–v2.6.11)** — `install.{sh,ps1}` seeds `registry.json` v2 schema, writes `bootstrap.json` from the latest `bootstrap/v*` tag, mkdirs knowledge subcategories + `external/`, inserts the `<skills_hub>` block into `CLAUDE.md`, appends `bin/` to PATH via shell profile, registers the `UserPromptSubmit`/`PreToolUse`/`PostToolUse` hooks in `~/.claude/settings.json`, and runs `precheck.py` once so `/hub-doctor`'s 12 checks all pass on a fresh install. After v2.6.11, `git pull` alone is enough to upgrade — post-merge re-runs `install.sh` whenever `bootstrap/` files change.
- ♻️ **Self-healing index** — git hooks (post-merge / post-commit / post-checkout) regenerate the L1/L2 corpus index after every mutation so `/hub-find` never goes stale (v2.5.0+).
- 📦 **Category-separated registry** — 20 canonical skill categories (`apm`, `backend`, `ai`, `arch`, `frontend`, `devops`, `db`, `testing`, `security`, `data`, `cli`, `git`, `debug`, `refactor`, `docs`, `workflow`, `game-dev`, `design`, `mobile`, `misc`), one skill per folder, frontmatter-driven.
- 🧠 **Three kinds of memory** — executable **skills** (recipes with triggers), non-executable **knowledge** (facts, decisions, pitfalls), and composition **techniques** (reusable recipes that reference 2-N atoms without copying them).
- 🔗 **Technique middle layer (v2.6.14+)** — `technique/<category>/<slug>/TECHNIQUE.md` composes existing skills/knowledge by reference. `composes[]` preserves atom independence (unlike `hub-merge` which absorbs), `loose` semver binding by default, v0 forbids technique-to-technique nesting. Lint rule guards `composes[]` (ref resolution, kind whitelist) at publish time.
- 🎨 **Example projects** — 28 ready-to-install reference builds under `example/` (dashboards, auth flows, resilience patterns, interactive toys).
- 🔁 **Round-trip workflow** — extract drafts from a session or full project → review → publish via one PR.
- 🌐 **Import from anywhere** — `/hub-import <git-url>` pulls skills from external repos (authored or extracted).
- 🤝 **Claude Code + [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) compatible** — works with vanilla Claude Code; integrates deeper with OMC.

---

## Repository Layout

```
skills/                       # category-separated skill registry
  <category>/                 # e.g. apm, backend, frontend, devops, testing, db, security, ai
    <skill-name>/
      SKILL.md                # frontmatter + overview (required)
      content.md              # main prompt / knowledge body (required)
      examples/               # optional
knowledge/                    # non-executable facts, decisions, pitfalls
  <category>/                 # api, arch, decision, domain, pitfall, schema-design, workflow
    <slug>.md                 # single file per entry
technique/                    # v2.6.14+ — composition recipes (references, not copies)
  <category>/
    <slug>/
      TECHNIQUE.md            # frontmatter with composes[] list + body (required)
      verify.sh               # optional sanity check for composed refs
      resources/              # optional aux assets
bootstrap/
  commands/                   # slash-command markdown files (37 total)
    # --- Core 8 (v2.6.0+) ---
    hub-find.md               # ranked KO↔EN synonym search               [v2.5.0]
    hub-suggest.md            # pre-implementation discovery              [v2.5.2]
    hub-install.md            # install skill (+ --all, --example flags)
    hub-list.md               # unified local list (skills/knowledge/…)   [v2.6.0]
    hub-extract.md            # mine project for patterns (+ --session)
    hub-publish.md            # unified publish (+ --only skills|…)       [v2.6.0]
    hub-sync.md               # pull remote + refresh installs
    hub-doctor.md             # diagnose & repair
    # --- Bootstrap / setup ---
    hub-init.md               # one-time project setup
    hub-status.md
    hub-commands-update.md
    hub-commands-publish.md
    # --- Support / infra ---
    hub-precheck.md           # lint + regenerate L1/L2 indexes           [v2.5.0]
    hub-index-diff.md         # per-commit index change report            [v2.5.0]
    hub-show.md               # display an installed entry's content
    hub-remove.md
    # --- Specialised maintenance ---
    hub-merge.md
    hub-split.md
    hub-refactor.md
    hub-condense.md           # corpus-level dedup/compress
    hub-cleanup.md            # remote maintenance (dedup, reindex, stale)
    hub-finalize.md
    hub-make.md
    hub-import.md
    hub-research.md
    # --- Legacy aliases (still work, prefer canonical) ---
    hub-install-all.md        → /hub-install --all
    hub-install-example.md    → /hub-install --example
    hub-list-skills.md        → /hub-list --kind skills
    hub-list-knowledge.md     → /hub-list --kind knowledge
    hub-list-examples.md      → /hub-list --kind examples
    hub-extract-session.md    → /hub-extract --session
    hub-publish-all.md        → /hub-publish (default = all)
    hub-publish-skills.md     → /hub-publish --only skills
    hub-publish-knowledge.md  → /hub-publish --only knowledge
    hub-publish-example.md    → /hub-publish --only example
    hub-search-skills.md      → /hub-find --kind skill
    hub-search-knowledge.md   → /hub-find --kind knowledge
  tools/                      # v2.5.0 — portable Python helpers
    _build_master_index.py        # L1 full index
    _build_master_index_lite.py   # L1 compact index (18 KB)
    _build_category_indexes.py    # L2 per-category indexes
    _lint_frontmatter.py          # schema validator (strict/non-strict)
    _fix_frontmatter.py           # auto-fill missing fields
    _index_diff.py                # commit-range report
    hub_search.py                 # ranked search CLI (180+ synonyms)
    precheck.py                   # lint + regen pipeline
    install-hooks.sh              # installs post-merge/commit/checkout hooks
  bin/                        # v2.5.0 — shell wrappers (add to PATH)
    hub-search, hub-precheck, hub-index-diff
  skills/
    skills-hub/SKILL.md       # umbrella OMC skill
  install.sh                  # bash installer (copies commands + tools + bin + runs hook installer)
  install.ps1                 # PowerShell installer (parity, v2.5.1+)
CATEGORIES.md                 # canonical category list
registry.json                 # skill + knowledge catalog
index.json                    # flat catalog (auto-generated by /hub-cleanup --reindex)
```

After installation, your local tree looks like:

```
~/.claude/
├── CLAUDE.md                # optional <skills_hub> block for auto-check
├── commands/                # 35 /hub-* slash commands
├── skills/                  # installed skills (per /hub-install)
└── skills-hub/
    ├── remote/              # clone of kjuhwa/skills-hub (+ .git/hooks/)
    ├── tools/               # Python helpers
    ├── bin/                 # hub-search / hub-precheck / hub-index-diff
    ├── indexes/             # auto-generated (post-merge/commit/checkout hook)
    │   ├── 00_MASTER_INDEX.md        # full flat index
    │   ├── 00_MASTER_INDEX_LITE.md   # compact (18 KB)
    │   └── category_indexes/         # one INDEX.md per (kind, category)
    ├── knowledge/           # installed knowledge
    ├── registry.json        # installed-skill manifest
    └── bootstrap.json       # { installed_version, source_ref }
```

---

## Quick Start

### 1. Install the bootstrap into your Claude config

**Linux / macOS / Git Bash on Windows:**
```bash
git clone https://github.com/kjuhwa/skills-hub.git ~/.claude/skills-hub/remote
bash ~/.claude/skills-hub/remote/bootstrap/install.sh
```

**PowerShell (Windows):**
```powershell
git clone https://github.com/kjuhwa/skills-hub.git $HOME\.claude\skills-hub\remote
powershell -ExecutionPolicy Bypass -File $HOME\.claude\skills-hub\remote\bootstrap\install.ps1
```

The installer copies and seeds everything a fresh `~/.claude/` needs to pass `/hub-doctor` on the first run:

**Copied (v2.5.0+)**
- `bootstrap/commands/*.md` → `~/.claude/commands/`
- `bootstrap/skills/skills-hub/` → `~/.claude/skills/skills-hub/`
- `bootstrap/tools/*.py` + `install-hooks.sh` → `~/.claude/skills-hub/tools/`
- `bootstrap/bin/hub-*` → `~/.claude/skills-hub/bin/`
- `bootstrap/completions/hub-completion.{bash,zsh,ps1}` → `~/.claude/skills-hub/completions/` (v2.6.4+)
- `bootstrap/hooks/hub-*.py` → `~/.claude/skills-hub/hooks/` (v2.6.10+)

**Seeded / registered (fresh-install gaps closed in v2.6.7+)**
- `registry.json` with the v2 schema `{ version: 2, skills: {}, knowledge: {} }` (v2.6.7+)
- `bootstrap.json` with `installed_version` derived from `git describe --tags` on the bootstrap tag (v2.6.7+)
- Knowledge subcategory dirs `knowledge/{api,arch,pitfall,decision,domain}/` and `external/` (v2.6.7+)
- `<skills_hub>` block appended/refreshed in `~/.claude/CLAUDE.md` (v2.6.8+)
- `~/.claude/skills-hub/bin` prepended to PATH via `~/.bashrc`/`~/.zshrc` or `$PROFILE` (v2.6.9+, idempotent `# skills-hub:path` marker, opt out with `SKILLS_HUB_NO_PROFILE=1`)
- `UserPromptSubmit` + `PreToolUse` + `PostToolUse` hooks registered in `~/.claude/settings.json` under `"_marker": "skills-hub:auto-suggest-hook"` (v2.6.10+/v2.6.12+, opt out with `SKILLS_HUB_NO_AUTO_SUGGEST=1`)
- `tools/precheck.py --skip-lint` executed once so `00_MASTER_INDEX*.md` + `category_indexes/` exist before any git hook fires (v2.6.7+)

**Git hooks**
- `install-hooks.sh` registers `post-merge` / `post-commit` / `post-checkout` inside `remote/.git/hooks/` so the indexes stay in sync after every pull / commit / branch switch.
- `post-merge` in v2.6.11+ additionally re-runs `install.sh` whenever the merged diff touches anything under `bootstrap/`, so `git pull` alone carries new commands, tools, hooks, and settings forward (opt out with `SKILLS_HUB_NO_AUTO_PATCH=1`).

Restart Claude Code to pick up the new slash commands.

### 2. Verify

Inside Claude Code:
```
/hub-list-skills
```
Should report "no skills installed yet" plus the empty registry — proves the hub is wired up.

---

## Command Reference

### Core 8 (v2.6.0+)

~90% of usage flows through eight canonical commands. Everything else is a specialised alias or a rarely-invoked maintenance tool.

| Command | When to reach for it |
|---|---|
| `/hub-find "<query>"` | Discover skills/knowledge by keyword — ranked, KO↔EN synonyms |
| `/hub-suggest "<task>"` | AI picks matching entries + offers install/reference (auto-fires on "구현해줘 / implement X") |
| `/hub-install <name>` | Install a skill locally (add `--all` for bulk, `--example` for demo projects) |
| `/hub-list` | See what's installed (`--kind skills\|knowledge\|examples\|all`, default all) |
| `/hub-extract` | Mine the current project for reusable patterns (add `--session` for current session only) |
| `/hub-publish` | Ship drafts back to the hub (default = all kinds on one PR; `--only skills\|knowledge\|example` narrows) |
| `/hub-sync` | Pull remote updates + refresh local installs + rebuild indexes |
| `/hub-doctor` | Diagnose & repair local installation issues |

**Legacy per-kind commands** (`/hub-list-skills`, `/hub-publish-all`, `/hub-extract-session`, `/hub-install-all`, `/hub-install-example`, `/hub-publish-skills`, `/hub-publish-knowledge`, `/hub-publish-example`) still work as aliases — same behaviour, same flags. New code should prefer the canonical names above.

### Setup

| Command | Purpose | Writes? |
|---|---|---|
| `/hub-init [--global/--force/--skip-clone]` | **One-time setup**: clones the remote cache, writes registry, draft dirs, gitignore. Run before any other `/hub-*` command. | local |

### Install & Search

| Command | Purpose | Writes? |
|---|---|---|
| `/hub-install <keyword \| name@version>` | Search remote → interactive install; supports version pinning | local install |
| `/hub-install-all [--global/--skills-only/--knowledge-only/--category=...]` | **Bulk install** every skill and every knowledge entry in one shot (from `main` HEAD; collisions skipped) | local install |
| `/hub-find <query> [-n N] [--kind/--category/--html/--json]` | **Ranked corpus search** with 180+ KO↔EN synonyms; scores `name`/`description`/`tags`/`triggers` (v2.5.0+) | no |
| `/hub-suggest <task description>` | **Pre-implementation discovery** — interprets a coding task and offers matching skill/knowledge with install/reference prompts (v2.5.2+) | no |
| `/hub-precheck [--strict] [--skip-lint]` | Lint frontmatter + regenerate L1/L2 indexes at `~/.claude/skills-hub/indexes/` (v2.5.0+) | local indexes |
| `/hub-index-diff [base-ref]` | Report entries added/modified/removed since a commit (v2.5.0+) | no |
| `/hub-search-skills <keyword>` | Preview remote skill matches + available tagged versions, no install | no |
| `/hub-search-knowledge <keyword> [--inject]` | Search knowledge; optionally inject top matches into current context | no (inject = context only) |
| `/hub-list-skills` | Show installed skills with source, version, pin state | no |
| `/hub-list-knowledge [--category/--tag/--linked-to/--orphans]` | List locally installed knowledge entries | no |
| `/hub-list-examples [--refresh/--verbose]` | List projects published under `example/` in the remote | no |
| `/hub-install-example [keyword] [--list/--stack=/--open]` | Browse and install example projects from `example/` into cwd | local copy |
| `/hub-show <name>` | Display the full content of an installed skill or knowledge entry | no |
| `/hub-status` | Show a compact summary of the skills hub (counts, staleness, health) | no |
| `/hub-sync [--skill=.. --version=..]` | Refresh cache; bulk update, targeted rollback, or `--unpin` | local |
| `/hub-remove <name>` | Uninstall a local skill | local |

### Technique Layer (v2.6.14+)

Composition recipes that reference 2-N skills/knowledge without copying them. See `technique/` directory and [the schema draft](./docs/rfc/technique-schema-draft.md).

| Command | Purpose | Writes? |
|---|---|---|
| `/hub-technique-compose <slug>` | Interactive authoring — pick atoms, assign roles, generate `TECHNIQUE.md` draft, auto-verify | local drafts |
| `/hub-technique-verify <slug>\|--all` | Schema §9 gate — composes refs exist, no technique nesting, frontmatter well-formed | no |
| `/hub-technique-list [--drafts-only\|--installed-only] [--category <cat>]` | List local drafts and installed techniques | no |
| `/hub-technique-show <slug> [--raw]` | Print body + expand `composes[]` with inline atom descriptions | no |
| `/hub-find --kind technique <query>` | Search techniques via the main `/hub-find` flow (v2.6.14+) | no |
| `/hub-find-techniques <query>` | *(deprecated)* Compatibility shim — migrate to `/hub-find --kind technique` | no |

### AI Pre-implementation Auto-check (opt-in)

When the user describes a coding task ("구현해줘", "implement X", "build Y"), Claude Code can *automatically* search the hub first and offer matching skills/knowledge before writing code. Add this block to your `~/.claude/CLAUDE.md` to enable:

```markdown
<skills_hub>
Pre-implementation auto-check.
When the user requests a concrete coding/implementation task with technical keywords,
silently run `/hub-find "<task keywords>" -n 3` before starting work.

If any result has a strong match (top score ≥ 10 AND name-token overlap with the task,
OR tags contain ≥ 2 task keywords):
  1. Present top 1-3 matches: `[kind/category] name · description · path`.
  2. Ask the user to pick:
       Skills    → ① 참조만 / ② 설치 (/hub-install <name>) / ③ 건너뛰기
       Knowledge → ① 읽고 반영 / ② 건너뛰기
  3. Wait for the choice before proceeding.

Skip for: trivial edits, pure debugging, read-only questions, or when the user has
already picked an approach and asked only for execution.
</skills_hub>
```

The manual entry point `/hub-suggest <task>` runs the same flow on demand without the rule.

### Extract & Draft

| Command | Purpose | Writes? |
|---|---|---|
| `/hub-extract [keyword] [--max=<n> --only=...]` | **Full project scan** → drafts BOTH skills and knowledge in `.skills-draft/` / `.knowledge-draft/`. Optional keyword focuses extraction. | local drafts |
| `/hub-extract-session [keyword]` | **Current session only** → drafts from recent changes. Optional keyword filters to that domain. | local drafts |
| `/hub-import <git-url> [--ref=... --extract/--no-extract/--as-knowledge]` | Import skills/knowledge from an external git repo (authored or extracted) and stage as drafts | local drafts |
| `/hub-research [<keyword>] [--trend-source=... --depth=... --only=... --dry-run]` | Research skills/knowledge from the web by keyword, or pull current engineering trends | local drafts |

### Publish & Ship

| Command | Purpose | Writes? |
|---|---|---|
| `/hub-publish-skills` | Review skill drafts → push to remote branch + `skills/<name>/v<ver>` tag | remote branch + tag |
| `/hub-publish-knowledge [--all/--draft=.../--pr]` | Review knowledge drafts → push to a feature branch, update `registry.json` | remote branch |
| `/hub-publish-all [--all/--pr/--only ...]` | One-shot publish of BOTH `.skills-draft/` and `.knowledge-draft/` on a single branch + PR | remote branch + skill tags |
| `/hub-publish-example <slug> [--from/--title/--why/--stack/--no-pr]` | Publish a local creation to `example/<slug>/` with README, branch, and PR | remote branch + PR |
| `/hub-finalize` | End-of-project: extract → review → publish → cleanup | remote branch |

### Refactor & Maintain

| Command | Purpose | Writes? |
|---|---|---|
| `/hub-merge <selector1> <selector2> [...]` | Combine 2+ remote skills/knowledge into one new draft | local drafts |
| `/hub-split <selector> [--by=section\|step\|concern\|auto]` | Decompose one remote entry into N focused drafts | local drafts |
| `/hub-refactor [--scope/--merge-threshold/...]` | Scan remote for merge + split candidates in one pass | local drafts |
| `/hub-condense [--mode=dedup\|compress\|auto --scope=... --dry-run]` | Corpus-level tightening: finds duplicated chunks across entries + single-entry compression opportunities | local drafts |
| `/hub-cleanup` | Remote maintenance: dedupe, re-index, stale review | remote branch (dry-run default) |
| `/hub-doctor` | Diagnose and repair local skills hub installation issues | local |
| `/hub-make [hint...]` | Creative build — inventories skills, checks prior art, builds, offers to publish | local + optional remote |

### Bootstrap (command files)

| Command | Purpose | Writes? |
|---|---|---|
| `/hub-commands-update [--version=x.y.z]` | Install/rollback the slash-command files themselves | local commands |
| `/hub-commands-publish [--bump=...]` | Publish command edits + `bootstrap/v<ver>` tag | remote branch + tag |

### Typical Workflow

```
# Project start
/hub-install apm             → install observability skills for an APM project
/hub-install backend         → grab useful backend patterns
/hub-install --all           → bulk-install every skill + knowledge

# Before a specific implementation
/hub-find "kafka avro"       → ranked search, KO↔EN synonyms
/hub-suggest 웹소켓 인증 구현   → interprets the task, offers matching skill + install prompt
# or just describe the task normally — with the <skills_hub> rule in CLAUDE.md,
# Claude auto-triggers the same flow on "구현해줘 / implement X" requests.

# During work — nothing needed, installed skills auto-activate via triggers

# Browse & install example projects
/hub-install --example dashboard → search + install matching examples
/hub-list --kind examples        → browse all available examples

# See what's installed locally
/hub-list                    → everything (skills + knowledge)
/hub-list --kind skills      → skills only

# Extract what you learned
/hub-extract --session       → drafts from just this session
/hub-extract kafka           → keyword-focused: only kafka-related patterns
/hub-extract                 → drafts from the whole project

# Import from external repos
/hub-import https://github.com/garrytan/gstack   → stage external skills as drafts

# Review & publish (one command handles both skills + knowledge)
/hub-publish --pr            → default: ships everything in .skills-draft/ + .knowledge-draft/
/hub-publish --only skills --pr
/hub-publish --only example <slug>

# Project wrap-up (one-shot)
/hub-finalize --scope=full --auto-pr
```

---

## Versioning (git tags)

Both skill content and the bootstrap command files use git tags for immutable versioning and rollback.

### Tag schemes

- **Per-skill**: `skills/<name>/v<semver>` — e.g. `skills/kafka-header-metadata/v1.2.0`
- **Bootstrap (command files)**: `bootstrap/v<semver>` — e.g. `bootstrap/v1.0.0`

Tags are annotated and created automatically by `/hub-publish-skills` and `/hub-commands-publish`.

### Recent bootstrap releases

| Version | Highlights |
|---|---|
| [`v2.6.13`](https://github.com/kjuhwa/skills-hub/releases/tag/bootstrap/v2.6.13) | **`install.ps1` UTF-8 BOM fix** — PowerShell 5.1 on non-UTF-8 locales (e.g. ko-KR CP949) misread em-dashes in the `<skills_hub>` here-string and wrote `??` into `CLAUDE.md`. Prepending `EF BB BF` forces UTF-8 parsing on PS 5.1 and is transparent to PS 7+. |
| [`v2.6.12`](https://github.com/kjuhwa/skills-hub/pull/1050) | **Blocking Write/Edit gate** — `hub-suggest-hint.py` now drops a pending flag at `~/.claude/skills-hub/state/hub_first_pending.flag` and the reminder is rewritten as a STOP gate. Companion `hub-write-gate.py` (`PreToolUse: Write\|Edit\|MultiEdit\|NotebookEdit`) refuses the first code-writing tool call while the flag exists; `hub-search-clear.py` (`PostToolUse: Bash\|Skill\|ToolSearch`) deletes the flag the moment a hub search runs. `_merge_settings.py` generalized for `--type/--matcher/--marker`. |
| [`v2.6.11`](https://github.com/kjuhwa/skills-hub/pull/1049) | **`git pull` is enough to upgrade** — `install-hooks.sh`'s `post-merge` now runs `precheck.py --skip-lint` AND, if `ORIG_HEAD..HEAD` touched any `bootstrap/` file, re-runs `install.sh` so new commands, tools, hooks, and settings entries apply automatically. Merge never aborts on failure. Opt out with `SKILLS_HUB_NO_AUTO_PATCH=1`. `/hub-doctor` check 8 verifies the marker is present. |
| [`v2.6.10`](https://github.com/kjuhwa/skills-hub/pull/1048) | **Auto-registered `UserPromptSubmit` hook** — `hub-suggest-hint.py` reads the prompt JSON from stdin, matches Korean (개발해/구현해/만들어/짜줘/작성해/구축해/추가해) and English (implement/build/create/develop/scaffold/write a/add a) implementation keywords with word-boundary regex, and emits a `<system-reminder>` telling Claude to invoke `/hub-suggest`. `_merge_settings.py` idempotently merges the entry into `~/.claude/settings.json` tagged `"_marker": "skills-hub:auto-suggest-hook"`. Slash commands skipped. Opt out with `SKILLS_HUB_NO_AUTO_SUGGEST=1`. |
| [`v2.6.9`](https://github.com/kjuhwa/skills-hub/releases/tag/bootstrap/v2.6.9) | **Auto-PATH on install** — `install.ps1` appends to `$PROFILE` (CurrentUserAllHosts) and `install.sh` to `~/.bashrc`/`~/.zshrc`, idempotent via a `# skills-hub:path` marker. Eliminates the last manual step after install and the `/hub-doctor` check-10 PATH warning on fresh installs. Opt out with `SKILLS_HUB_NO_PROFILE=1`. |
| [`v2.6.8`](https://github.com/kjuhwa/skills-hub/releases/tag/bootstrap/v2.6.8) | **`<skills_hub>` block written on install** — both installers now idempotently create/refresh/append the canonical auto-check block (pointing at `/hub-find`, `/hub-install`, `/hub-list`, `/hub-publish`) to `~/.claude/CLAUDE.md` so `/hub-doctor` check 11 passes and `/hub-uninstall`'s documented block-removal step has something to remove. |
| [`v2.6.7`](https://github.com/kjuhwa/skills-hub/releases/tag/bootstrap/v2.6.7) | **Installer seeds missing hub state** — fresh install no longer leaves `/hub-doctor` with FAIL/WARN. Installer now writes `registry.json` v2 schema (re-seeds `"{}"` leftovers + strips BOM from older PowerShell writes), writes `bootstrap.json` with `installed_version` from `git describe --tags`, mkdirs `knowledge/{api,arch,pitfall,decision,domain}/` + `external/`, and runs `tools/precheck.py --skip-lint` once so indexes exist before the first git hook fires. |
| [`v2.6.6`](https://github.com/kjuhwa/skills-hub/releases/tag/bootstrap/v2.6.6) | **`/hub-uninstall`** — inverse of `install.sh`: removes the entire bootstrap layer (remote cache, tools, bin, completions, indexes, registry, slash commands, seed skill, `<skills_hub>` block). Dry-run by default, mandatory `UNINSTALL` literal confirm, automatic backup tarball. Preserves individually-installed skills (`~/.claude/skills/<slug>/`) unless `--purge-installed`. Never touches project-scoped `.claude/` trees. |
| [`v2.6.5`](https://github.com/kjuhwa/skills-hub/releases/tag/bootstrap/v2.6.5) | **`/hub-install` now installs knowledge too** — new `--kind=<skill\|knowledge\|auto>` flag (default `auto`). Knowledge lands at `~/.claude/skills-hub/knowledge/<category>/<slug>.md` (global) or `.claude/knowledge/<category>/<slug>.md` (project-scoped) for offline reads, PR-reviewable curation, and version pinning. `registry.json` v2's pre-existing `knowledge` namespace is finally populated. No tags for knowledge yet — `@version` resolves via frontmatter match or `--force-main`. |
| [`v2.6.4`](https://github.com/kjuhwa/skills-hub/releases/tag/bootstrap/v2.6.4) | **Scale guards + shell completion** — `/hub-publish-all` auto-chunks into batched PRs past 50 drafts (refuses ≥1000 without `--force-large`), `/hub-install` shows a discovery panel (recent installs + categories + counts) when invoked with no args, and bash/zsh/PowerShell tab-completion scripts ship for the `hub-*` bin wrappers (Claude Code REPL still has no arg autocomplete — documented limitation). |
| [`v2.6.3`](https://github.com/kjuhwa/skills-hub/releases/tag/bootstrap/v2.6.3) | **`/hub-install` optimization** — exact-name fast path skips interactive prompt, auto-fetch removed (opt-in via `--refresh`), graceful version fallback (tag → frontmatter → friendly hint / `--force-main`) replaces the old "tag or bust" behavior. |
| [`v2.6.2`](https://github.com/kjuhwa/skills-hub/releases/tag/bootstrap/v2.6.2) | **`/hub-doctor` v2.5.x awareness** — 11 checks covering tools/bin installation, git hooks, index freshness, shell PATH, and the `<skills_hub>` CLAUDE.md block. |
| [`v2.6.1`](https://github.com/kjuhwa/skills-hub/releases/tag/bootstrap/v2.6.1) | **Bulk-scan delegation** — `/hub-import`, `/hub-extract`, `/hub-refactor`, `/hub-condense`, `/hub-cleanup`, `/hub-research` now delegate file/web scanning to an Explore subagent. ~70 tool calls → ~5 for typical runs. |
| [`v2.6.0`](https://github.com/kjuhwa/skills-hub/releases/tag/bootstrap/v2.6.0) | **Command consolidation** — 35 commands → Core 8 canonical entry points. `/hub-list`, `/hub-publish` added; dispatch flags on `/hub-extract`, `/hub-install`. Legacy names still work. |
| [`v2.5.4`](https://github.com/kjuhwa/skills-hub/releases/tag/bootstrap/v2.5.4) | `tools/_rebuild_index_json.py` + `/hub-publish-all` spec hardened (SHA-map for tagging, post-merge retag step). |
| [`v2.5.3`](https://github.com/kjuhwa/skills-hub/releases/tag/bootstrap/v2.5.3) | CRLF → LF normalization + `.gitattributes` (fixes slash-command description rendering on Windows). |
| [`v2.5.2`](https://github.com/kjuhwa/skills-hub/releases/tag/bootstrap/v2.5.2) | `/hub-suggest` — pre-implementation discovery prompt. |
| [`v2.5.1`](https://github.com/kjuhwa/skills-hub/releases/tag/bootstrap/v2.5.1) | `install.ps1` parity with `install.sh` (Windows/PowerShell). |
| [`v2.5.0`](https://github.com/kjuhwa/skills-hub/releases/tag/bootstrap/v2.5.0) | `bootstrap/tools/` + `bootstrap/bin/` + git hook installer; adds `/hub-find`, `/hub-precheck`, `/hub-index-diff`. |
| [`v2.4.4`](https://github.com/kjuhwa/skills-hub/releases/tag/bootstrap/v2.4.4) | `/hub-sync` calls `hub-precheck` after `git reset --hard`; `/hub-search-*` cross-link to `/hub-find`. |

Full history: `git tag -l "bootstrap/v*" | sort -V`. Your installed version is in `~/.claude/skills-hub/bootstrap.json`.

### Installing a specific skill version

```
/hub-install my-skill@1.1.0
# or
/hub-install my-skill --version=1.1.0
```

Versioned installs are marked `pinned: true` in `~/.claude/skills-hub/registry.json` and are skipped by bulk `/hub-sync` (unless `--force`).

### Rolling back an installed skill

```
/hub-sync --skill=my-skill --version=1.0.0   # rollback to v1.0.0, pins
/hub-sync --skill=my-skill --unpin           # resume tracking latest
```

### Updating the slash commands themselves

```
/hub-commands-update                     # latest (main HEAD)
/hub-commands-update --version=1.2.0     # specific tagged release
/hub-commands-update --dry-run           # preview diff only
```

Current bootstrap version is recorded in `~/.claude/skills-hub/bootstrap.json`. Rolling back to an older tag is supported — you will be asked to confirm a downgrade.

### Publishing a new command release

After editing local command files under `~/.claude/commands/`:

```
/hub-commands-publish --bump=patch --pr
```

This creates a branch, commits the changes under `bootstrap/commands/`, adds tag `bootstrap/v<next>`, pushes both, and (optionally) opens a PR. Existing tags are never overwritten.

---

## Writing a Skill

Each skill lives at `skills/<category>/<skill-name>/`.

**Required: `SKILL.md` frontmatter**

```yaml
---
name: kebab-case-name
description: One specific sentence that mentions trigger keywords naturally.
category: apm
tags: [observability, tracing, otel]
triggers: [OpenTelemetry, OTEL, span, trace context]
source_project: my-project
version: 1.0.0
---

# Skill Title

Short overview. Link to content.md for the body.
```

**Required: `content.md`**

Structure:
- **Problem**: what recurring issue this addresses
- **Pattern**: the generalizable shape / approach
- **Example**: one sanitized example (no project-specific names, paths, credentials)
- **When to use**: triggers and preconditions
- **Pitfalls**: known gotchas

**Naming rules**
- `name`: `[a-z0-9-]+`
- `category`: must exist in `CATEGORIES.md` (propose new ones via PR)
- `version`: semver

---

## Contributing

1. Use `/hub-extract` or `/hub-extract-session` in a real project to produce drafts.
2. Review each draft locally — sanitize, add examples, refine triggers.
3. `/hub-publish-skills --pr` creates a branch like `skills/add-<category>-<date>` and opens a PR.
4. Never push directly to `main` — all contributions go through branches.

### Category Proposals

If you need a new category, edit `CATEGORIES.md` in the same PR that adds the first skill using it. Keep categories **broad** (<=20 total) — tags do the fine-grained work.

---

## Knowledge (non-executable)

`/hub-extract` recognises two distinct artifact classes when mining a session or git history:

- **Skills** — reusable *executable* procedures (existing flow). Stored under `~/.claude/skills/<slug>/`.
- **Knowledge** — *non-executable* facts, architecture decisions, pitfalls, domain context that are valuable to remember but not to "run". Stored under `~/.claude/skills-hub/knowledge/<category>/<slug>.md`.

### Classification rules

| Chunk shape | Verdict |
|---|---|
| "Do X by following steps ..." (input -> procedure -> output) | `skill` |
| "X is true because ..." (declaration, constraint, decision, lesson) | `knowledge` |
| Procedure + rationale mixed | `both` — two files with bidirectional `linked_*` references |
| One-off / context-dependent fragment | `drop` |

### Knowledge categories

`api`, `arch`, `decision`, `domain`, `pitfall`, `workflow` — kept separate from skill categories so knowledge can be browsed independently.

### Knowledge file frontmatter

```yaml
---
name: <slug>
type: knowledge
category: api | arch | pitfall | decision | domain
tags: [...]
summary: "one-line summary (<=150 chars)"
source: { kind: session|commit|diff, ref: <id> }
confidence: high | medium | low
linked_skills: [...]
supersedes: <slug-or-null>
extracted_at: YYYY-MM-DD
---
```

Body sections: `## Fact` / `## Context / Why` / `## Evidence` / `## Applies when` / `## Counter / Caveats`.

### Typical flow

```
/hub-extract --from range main..HEAD         # classify each commit
/hub-extract kafka --from session            # keyword-focused: only kafka-related
# review preview, toggle entries, confirm
/hub-list-knowledge                          # see what was added
/hub-search-knowledge "kafka routing" --inject  # prime context before work
```

Knowledge publishing is supported. Use `/hub-publish-knowledge` to push drafts under `.knowledge-draft/` to a feature branch (no version tags — knowledge is content-addressed, history is the trail). For releases that contain both skills and knowledge from the same extraction round, use `/hub-publish-all` to ship them on a single branch + PR; knowledge commits land first so skills can reference the knowledge slug in the same branch. Registry schema is `v2` (`knowledge: {}` key + `linked_knowledge` on each skill).

---

## Importing from External Repos

`/hub-import` lets you pull skills and knowledge from any public (or accessible) git repository:

```
# Repo with authored SKILL.md files — stage verbatim as drafts
/hub-import https://github.com/garrytan/gstack

# Arbitrary source repo — extraction pipeline discovers patterns
/hub-import https://github.com/some-org/their-project --extract-only

# Convert external skills into knowledge references for comparison
/hub-import https://github.com/garrytan/gstack --as-knowledge

# After import, publish the drafts
/hub-publish-all --pr
```

Imported drafts are staged under `.skills-draft/` and `.knowledge-draft/` with full attribution (`source_type`, `source_url`, `source_commit`). Nothing is installed directly — review before publishing.

---

## Remote Maintenance: merge / split / refactor

Once the registry has grown, three commands help keep it coherent. All three are **read-only on the remote cache** — they produce drafts under `.skills-draft/` / `.knowledge-draft/` that ship via the normal publish flow (`/hub-publish-skills`, `/hub-publish-knowledge`, or `/hub-publish-all`).

### Selectors

`/hub-merge` and `/hub-split` accept selectors pointing to existing remote entries:

- `skill:<category>/<name>` — e.g. `skill:backend/retry-with-jitter-backoff`
- `knowledge:<category>/<slug>` — e.g. `knowledge:pitfall/retry-storms-without-jitter`
- `<category>/<name>` — kind auto-detected; ambiguous -> error, require prefix
- `@v<semver>` suffix on any of the above pins to a tag (skills only): `skill:backend/retry@v1.2.0`

### Merge — consolidate overlapping entries

```
/hub-merge skill:backend/retry-with-jitter skill:backend/retry-on-5xx \
    knowledge:pitfall/retry-storms --name=unified-retry-strategy
```

Produces one new skill draft with the union of problems, a single unified `Pattern`, preserved `Alternative examples`, and mandatory `merged_from` / `## Provenance` attribution. Knowledge sources are summarized into a `## Background` section and cross-linked via `linked_knowledge`, not duplicated as files. Default behavior marks sources with `supersedes: [...]` so `/hub-cleanup` can later propose deprecation; `--keep-sources` omits the hint.

### Split — break up multi-purpose entries

```
/hub-split skill:backend/retry-strategy --by=concern
```

Strategies: `section` (split by topical `##` headers), `step` (skills-only — per-step decomposition), `concern` (cluster paragraphs by dominant tag), `auto` (try `concern` -> `section` -> `step`). Refuses to split entries below ~400 body lines. Each child draft inherits confidence (knowledge) and lists its `siblings` for navigation. Oversize alone doesn't qualify — the detector must find >=2 clean clusters.

### Refactor — one pass, both operations

```
/hub-refactor --scope=backend --merge-threshold=0.75
```

Scans the remote, finds merge candidates (tag + content similarity clusters) **and** split candidates (large entries with >=2 concerns), resolves overlap (merge wins when an entry qualifies for both), presents a single review table, then delegates to `/hub-merge` and `/hub-split` for accepted candidates. Results aggregate into `.skills-draft/_REFACTOR_MANIFEST.md`. Ship with `/hub-publish-all --pr` so cross-links land in one branch.

Use `/hub-refactor` periodically (monthly, or after a burst of publish activity). For targeted single operations, call `/hub-merge` or `/hub-split` directly — they're cheaper.

---

## Safety & Conventions

- `/hub-publish-skills` and `/hub-cleanup` always dry-run first. Writes require per-item confirmation.
- Cleanup **never auto-deletes** stale skills. Always human-reviewed PRs.
- `extract` writes only to `.skills-draft/` (add it to your project `.gitignore`).
- Skill content must be **generalizable** — no business names, credentials, internal URLs.

---

## License

MIT. Contributions welcome.
