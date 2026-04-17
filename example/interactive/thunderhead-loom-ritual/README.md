# Thunderhead Loom Ritual

> **Why.** A rhythm-puzzle where you weave storm-threads into silver tapestries before giants wake from their meadow dream.

## Features

- Stateless turn-combat adapted from `stateless-turn-combat-engine` and `event-returning-pure-reducer`
- Immutable action log per `immutable-action-event-log` with replay scrubber
- Soft/hard pity gauge borrowing `gacha-soft-hard-pity` when loom beats keep missing
- Phase-window timing grading via `phase-window-timing-grade-with-pity` golden arc
- Status effects (charged, dreaming, blooming, stunned) modeled on `status-effect-enum-system`
- FSM-driven storm cycle per `finite-state-machine-data-simulation`
- Bulkhead loom slots by `bulkhead-data-simulation` preventing single-giant starvation
- Circuit-breaker on over-weaving ≈ `circuit-breaker-data-simulation`, `circuit-breaker-visualization-pattern`
- Backpressure hint bar uses `backpressure-data-simulation` discrete tick
- Retry/jitter cooldowns via `retry-strategy-data-simulation` + `cache-variance-ttl-jitter`
- Rate-limited thunder-claps ≈ `rate-limiter-data-simulation` token bucket
- Idempotent weave commits honoring `idempotency-data-simulation` and `idempotency-visualization-pattern`
- Dream-giant AI uses `adaptive-strategy-hot-swap` swap on streaks
- Tapestry composition animated via `parallax-sine-silhouette-horizon` and `css-sprite-sheet-phase-row-switch` inspiration
- Meadow chorus triggers based on `availability-ttl-punctuate-processor` wall-clock ticks
- Silver-thread weave uses `fnv1a-xorshift-text-to-procedural-seed` ritual seeds
- Pure reducer state built per `event-returning-pure-reducer` (state,events)=>(state',events')
- Risk gates before a full thunder-burst borrow `layered-risk-gates` admission→monitor→breaker
- Scoring uses `baseline-historical-comparison-threshold` against last round
- Tiered rebalance for loom-slot cooldowns ≈ `tiered-rebalance-schedule`
- Keyboard hotkeys via `menu-key-config-registry` discipline
- Wildflower combo counter follows `frozen-detection-consecutive-count` dampening
- Storm charge discharge ≈ `divide-by-zero-rate-guard` on rate calc
- Golden-window pity uses `phase-window-timing-grade-with-pity`
- Giant dream meter styled as `lantern-visualization-pattern` ember with `hue-rotate-sprite-identity` tint
- Loom slot queue mimic `thread-pool-queue-backpressure` pause/resume
- Status panel ≈ `widget-card-composition` chrome and `drawer-resizable-mouse-drag` feel
- Action log pane ≈ `log-aggregation-visualization-pattern` density + `distributed-tracing-visualization-pattern` waterfall
- Commit path respects `dry-run-confirm-retry-write-flow` for big discharges
- Reset uses `json-clone-reducer-state-constraint` aware deep copy
- Scoring guard: `arbitrary-display-caps-hide-signal` avoided (no hard cap)
- ## Skills applied
- `stateless-turn-combat-engine`, `event-returning-pure-reducer`, `immutable-action-event-log`, `gacha-soft-hard-pity`, `phase-window-timing-grade-with-pity`, `status-effect-enum-system`, `finite-state-machine-data-simulation`, `bulkhead-data-simulation`, `circuit-breaker-data-simulation`, `circuit-breaker-visualization-pattern`, `backpressure-data-simulation`, `retry-strategy-data-simulation`, `cache-variance-ttl-jitter`, `rate-limiter-data-simulation`, `idempotency-data-simulation`, `idempotency-visualization-pattern`, `adaptive-strategy-hot-swap`, `parallax-sine-silhouette-horizon`, `css-sprite-sheet-phase-row-switch`, `availability-ttl-punctuate-processor`, `fnv1a-xorshift-text-to-procedural-seed`, `layered-risk-gates`, `baseline-historical-comparison-threshold`, `tiered-rebalance-schedule`, `menu-key-config-registry`, `frozen-detection-consecutive-count`, `divide-by-zero-rate-guard`, `lantern-visualization-pattern`, `hue-rotate-sprite-identity`, `thread-pool-queue-backpressure`, `widget-card-composition`, `drawer-resizable-mouse-drag`, `log-aggregation-visualization-pattern`, `distributed-tracing-visualization-pattern`, `dry-run-confirm-retry-write-flow`, `incommensurate-sine-organic-flicker`, `canvas-flowfield-particle-advection`, `canvas-trail-fade-vs-clex-vs-clear`
- ## Knowledge respected
- `json-clone-reducer-state-constraint`, `arbitrary-display-caps-hide-signal`, `divide-by-zero-rate-guard`, `finite-state-machine-implementation-pitfall`, `bulkhead-implementation-pitfall`, `retry-strategy-implementation-pitfall`, `circuit-breaker-implementation-pitfall`, `backpressure-implementation-pitfall`, `idempotency-implementation-pitfall`, `rate-limiter-implementation-pitfall`, `actor-model-implementation-pitfall`, `event-sourcing-implementation-pitfall`

## File structure

```
thunderhead-loom-ritual/
  index.html    — shell, markup, inline SVG where used
  style.css     — dark-theme styling and animations
  app.js        — interactions, simulated data, render loop
  manifest.json — hub metadata
```

## Usage

```bash
# any static file server works
python -m http.server 8080
# or open index.html directly in a browser
```

## Stack

`html` · `css` · `vanilla-js` — zero dependencies, 215 lines

## Provenance

- Generated by auto-hub-loop cycle 5 on 2026-04-17
- Theme keyword: `Mountain cloud-weavers spin thunderheads into silver tapestries as stone giants dream beneath meadows of singing wildflowers and starlight.`
- Source working copy: `30-thunderhead-loom-ritual`
