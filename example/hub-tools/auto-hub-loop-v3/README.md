# Hub Auto-Loop Dashboard (v3)

> **Why.** v3 introduces a drop-in `hub-loop-v3/` module layer that replaces the force-quota extraction flow — compressed-index prompts, frontmatter-derived purposes, and a fuzzy dedup gate that catches paraphrased duplicates the old name-equality check missed.

## What's new in v3

- **`hub-loop-v3/hub-inventory.js`** — scans skills-hub once per cycle, derives `purpose` from YAML frontmatter `description:` (falls back to first prose sentence), and produces a compressed one-line index instead of dumping full SKILL.md bodies into every prompt.
- **`hub-loop-v3/dedup-gate.js`** — zero-dep fuzzy duplicate detector using trigram + token + slug Jaccard similarity. Replaces "tell Claude to avoid duplicates in prompt" with a code gate. Rejects templated suffixes (`-visualization-pattern`, `-data-simulation`, etc.) and paraphrases against the full hub.
- **`hub-loop-v3/theme-strategies.js`** — optional weighted theme picker (gap-driven / combinatorial / exploratory). Available but not wired by default — keeps the existing `pickKeyword` NOUNS-ONLY IT-terminology behavior.
- **`hub-loop-v3/prompts/extraction.md`** — novelty-first v3 extraction prompt with explicit "zero is a valid answer" framing.

## Features (from v2, preserved)

- **7-phase pipeline** — generate → build → publish → merge → extract → publish-sk → install → loop
- **Evocative 5–15 word NOUN-ONLY IT-terminology themes** via `pickKeyword` (Claude-generated)
- **Live Recipe panel** — real-time display of skills/knowledge cited each cycle
- **Status strip** — current phase (n/7), live elapsed time, theme phrase
- **Run Once / Start Loop** — single-cycle or continuous mode
- **Real-time SSE log stream** with color-coded levels
- **Apps built / Skills acquired panels** with PR links

## File structure

```
auto-hub-loop-v3/
  server.js                    HTTP server + SSE + 7-phase orchestration (~1300 lines)
  index.html                   Dashboard UI (~900 lines)
  manifest.json                Hub metadata
  hub-loop-v3/                 v3 drop-in modules
    hub-inventory.js           Compressed-index scanner (frontmatter-aware)
    dedup-gate.js              Fuzzy dedup filter (trigram/token/slug Jaccard)
    theme-strategies.js        Optional weighted theme picker (not wired)
    prompts/
      extraction.md            v3 novelty-first extraction prompt
  files/                       Drop-in originals (INTEGRATION.md + sources)
    INTEGRATION.md             Wiring guide
    hub-inventory.js           Original v3 module (pre-adapted)
    dedup-gate.js              Original v3 module
    theme-strategies.js        Original v3 module
    extraction.md              Original v3 prompt
```

## Usage

```bash
node server.js
# open http://localhost:8917
# click "Start Loop" or "Run Once"
```

### Pipeline phases (v3 wiring)

1. **Cycle start** — `refreshInventory()` scans skills-hub (zero Claude calls, cache-friendly)
2. **Generate Ideas** — theme from `pickKeyword`, prompt uses v3 compressed index
3. **Build Apps** — parse `===APP===` blocks → write `NN-slug/` directories
4. **Publish PRs** — git branch + commit + push + `gh pr create` for each app
5. **Auto-Merge** — `gh pr merge --merge` per PR
6. **Extract Skills** — Claude emits `===SKILL===` / `===KNOWLEDGE===` blocks
7. **Dedup gate** — `dedupGate.filter()` against full inventory; broadcasts `dedup-review` + `dedup-rejected` SSE events; only `accepted` items proceed
8. **Publish S/K** — single PR with extracted items, auto-merged
9. **Install All** — copy new items into `~/.claude/skills/` and `.claude/knowledge/`

## Stack

`node` · `html` · `css` · `vanilla-js` — zero external dependencies

## Skills applied

| Skill | Used for |
|---|---|
| `stdin-redirect-cli-large-prompts` | >30KB prompt delivery via temp file + shell redirect |
| `full-inventory-over-sampling-prompt` | Passing all 400+ hub items (compressed) to Claude |
| `parallel-build-sequential-publish` | Build locally in batch, publish to git one at a time |
| `zero-dep-dark-html-app` | Dashboard scaffold |

## Knowledge respected

| Knowledge | Why |
|---|---|
| `dashboard-decoration-vs-evidence` | Recipe panel shows actual cited skills, not animated decoration |
| `single-keyword-formulaic-llm-output` | Themes are multi-word phrases, not single words |
| `batch-pr-conflict-recovery` | Per-PR flow avoids catalog README edits |
| `flat-vs-categorized-folder-structure` | Publishes to `example/<category>/<slug>/` not flat |

## Provenance

- v3 built on 2026-04-18 by wiring drop-in modules from `files/` into an adapted `hub-loop-v3/` layer.
- Source working copy: `F:/workspace/tool/auto-hub-loop`
- Predecessor: `example/hub-tools/auto-hub-loop` (v2, PR #111 and subsequent rewrite)
