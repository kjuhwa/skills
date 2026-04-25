---
version: 0.1.0-draft
name: evidence-compaction-multi-phase-strategy
summary: OpenSRE applies three layers of log/evidence compaction (deduplication by normalized signature, structured error taxonomy, raw truncation with totals) to keep noisy production logs within LLM context budgets without losing distinct error types.
category: observability
tags: [logs, compaction, llm-context, taxonomy]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/tools/utils/log_compaction.py
imported_at: 2026-04-18T00:00:00Z
confidence: high
---

# Evidence Compaction — Multi-Phase Strategy

## The problem
A failing production service can emit hundreds of log lines per minute. With a hard cap of 50 lines per LLM prompt, a burst of 48 identical timeout messages consumes 48 of those slots, pushing distinct errors off the edge.

## Three layers
1. **Phase 1 — Deduplication** (`deduplicate_logs`)
   Normalize variable tokens (UUIDs, timestamps, IPs, hex addresses, metric values) into `<*>` and group by `(log_level, normalized_message)`. Each group keeps `count`, `first_seen`, `last_seen`. A burst of 48 timeouts becomes ONE entry with `count: 48`.

2. **Phase 2 — Error Taxonomy** (`build_error_taxonomy`)
   Pre-compiled regex list maps each error to a category (`ConnectionTimeout`, `OutOfMemory`, `AuthenticationError`, `SchemaValidation`, ...). Each category keeps a count, sample messages, and extracted affected components. Result: a structured "what kinds of failures happened" instead of raw lines.

3. **Phase 3 — Truncation with totals** (`compact_logs`, `compact_traces`, `compact_metrics`)
   Apply final caps on lists and per-message char limits. Whenever truncation happens, add a `<key>_total` field so the LLM knows it's seeing a sample.

## When each layer runs
- Layers 1 + 2 run inside fetcher tools (Datadog, Loki, Grafana) before evidence is returned to the agent state.
- Layer 3 runs in `summarize_execution_results` post-processing; final guard before evidence enters the diagnosis prompt.

## Why this matters
- Without layer 1: 48 timeouts crowd out distinct errors.
- Without layer 2: the LLM has to do its own clustering; it inconsistently catches some categories and misses others.
- Without layer 3: a single tool returning 1MB of logs blows the prompt budget for everything else.

## Trade-off
Aggressive compaction loses fidelity. Mitigated by:
- Always exposing `total_logs_fetched` so the model can ask for more.
- Keeping a small `raw_samples` list (10 messages) alongside the taxonomy.
- Soft cap (50 / 30 / 20 per evidence type) tuned to fit ~3 evidence dicts in a single 16k-context call.
