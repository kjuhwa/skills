# Coverage Gate Benchmark

> **Experiment artifact** for paper [`workflow/parallel-dispatch-breakeven-point`](../../../paper/workflow/parallel-dispatch-breakeven-point/PAPER.md).

Zero-dependency single-file HTML benchmark that tests the paper's claim — **"parallel subagent dispatch stops paying off beyond ~70% prior-work coverage"** — against five measured corpus domains with an interactive cost model.

## Open

`index.html` directly in any browser. No build, no server.

## What it does

1. **§1 — Measured corpus coverage** — five domains grep'd from `kjuhwa/skills-hub`:
   - A. Skills with `triggers:` populated (51.1%)
   - B. Skills with `content.md` sibling (36.8%)
   - C. Knowledge with `description:` field (55.0%)
   - D. Knowledge with `tags:` key (100%)
   - E. Skills with stable version 1.x+ (80.3%)
2. **§2 — Interactive cost parameters** — sliders for A (agents), α (startup/agent), v (verify/file), w (work/file).
3. **§3 — Per-domain recommendations** — for each domain, the model computes wall-clock savings, cost overhead, useful output, and classifies as PARALLEL / BORDERLINE / SAMPLING / NO DISPATCH.
4. **§4 — Cost & speedup curves** — green (wall-clock saved) and orange (cost overhead) plotted across 0–100% coverage. 70% threshold marker + domain position markers.
5. **§5 — Finding** — dynamic verdict on whether the 70% threshold holds under current parameters.

## Finding under default parameters (A=4, α=30, v=5, w=60)

| Domain | Coverage | Recommendation | Matches paper's prediction? |
|---|---|---|---|
| B — skills with content.md | 36.8% | PARALLEL | ✓ (below 70% → parallel) |
| A — skills with triggers | 51.1% | PARALLEL | ✓ (below 70% → parallel) |
| C — knowledge with description | 55.0% | PARALLEL | ✓ (below 70% → parallel) |
| E — skills with version 1.x+ | 80.3% | PARALLEL | **✗ model disagrees with "70% threshold"** |
| D — knowledge with tags | 100.0% | NO DISPATCH | ✓ (useful output = 0) |

**Paper's premise partially supported.** The 70% threshold is not a constant — it shifts with cost ratios. Under typical "tokens cheap, time expensive" weights, parallel stays profitable up to ~90%+ coverage because wall-clock savings dominate the flat startup overhead. The threshold only drops near 70% when startup overhead is comparable to per-file work cost (α ≳ N·w / A · useful-ratio).

This is an honest finding: the paper's claim was directionally correct (high coverage → parallel less valuable) but the specific 70% number was an observation from one session rather than a robust cost-model outcome.

## Provenance

- Built: 2026-04-24
- Subject paper: `paper/workflow/parallel-dispatch-breakeven-point`
- Status reported back to paper's `experiments[0]`: `completed`, `supports_premise: partial`
- Data source: live grep against `~/.claude/skills-hub/remote/` at commit snapshot

## Stack

`html` + vanilla JS, zero dependencies, single file.

## Why this exists

This is not a production tool. It is the **execution artifact** demanded by paper-schema v0.2's `experiments[]` field — the paper cannot transition to `status: implemented` without a shipped build that tests its premise. The benchmark closes that loop and records what the test actually found, which is more nuanced than the paper originally asserted.
