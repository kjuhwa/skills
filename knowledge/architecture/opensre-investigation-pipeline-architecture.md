---
version: 0.1.0-draft
name: opensre-investigation-pipeline-architecture
summary: The OpenSRE agent splits an SRE investigation into six discrete LangGraph nodes (extract → resolve → plan → investigate → diagnose → publish) with a bounded plan-investigate-diagnose loop, dual chat/investigation entry modes, and per-investigation masking that survives state transitions.
category: architecture
tags: [langgraph, agent-pipeline, sre, multi-stage]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/pipeline/graph.py
imported_at: 2026-04-18T00:00:00Z
confidence: high
---

# OpenSRE Investigation Pipeline Architecture

## High-level flow
1. **inject_auth** (entry) — pull auth/org/user/thread/run from `RunnableConfig` and merge into state.
2. Conditional split: `mode=="investigation"` → `extract_alert`; else → `router`/`chat_agent` chat path.

### Investigation path
3. **extract_alert** — single LLM call that simultaneously classifies noise vs alert AND extracts routing fields (alert_name, pipeline_name, severity, alert_source, kube_namespace, error_message, log_query, eks_cluster, pod_name, deployment, ...). On classified noise, short-circuit to END.
4. **resolve_integrations** — load configured integrations from local store, normalize them per platform.
5. **plan_actions** — prompt a tool-call LLM with available actions, sources, and budget; produce ranked planned actions + rationale. Falls back to a hard-coded verification action if the LLM returns empty.
6. **investigate** — run each planned action's `extract_params/run` against the available sources; post-process results into `evidence`. Mask before returning so downstream LLM nodes never see raw identifiers.
7. **diagnose** — reasoning LLM analyzes evidence; outputs root cause, category, validated/non-validated claims, causal chain. Validated claims are double-checked against evidence with a deterministic rule table; failed checks downgrade them to `failed_validation` with a 0.5 weight in the score. Loops back to `plan_actions` if recommendations remain and loop count ≤ MAX (4).
8. **publish** — render the report (Slack/CLI/Google Doc/Jira), unmask identifiers, end.

### Chat path
- **router** classifies intent.
- **chat_agent** issues tool calls; **tool_executor** runs them; loops until no tool calls.
- **general** node handles everything else.

## Key cross-cutting features
- **Reversible masking** (`MaskingContext.from_state(state) → mask → store map → unmask on output`) means the LLM gets `<NS_0>` instead of real namespace names but users still see real ones.
- **Guardrails** scan every LLM input and either redact, block, or audit.
- **Loop counter + recommendations** drive the investigate→diagnose loop; controller defaults to publish on any uncertainty.
- **Bounded plan/tool budgets** track per-loop tool calls so a runaway plan doesn't fan out indefinitely.

## Why this shape
- Splitting noise classification into the same LLM call as extraction halves cost vs a two-call setup.
- Putting `resolve_integrations` outside the loop avoids re-loading credentials each iteration.
- The plan/investigate/diagnose loop matches how human SREs work: hypothesize → fetch evidence → analyze → either publish or dig deeper.
- The masking context lives in state (`masking_map` key) so it's serialized through LangGraph checkpoints just like everything else.
