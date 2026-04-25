---
version: 0.1.0-draft
name: investigation-state-shape
summary: OpenSRE's investigation state is a TypedDict with ~30 keys spanning auth (org_id, user_id), alert (raw_alert, alert_name, severity, is_noise), routing (alert_source, kube_namespace), planning (planned_actions, plan_audit, available_action_names), evidence (the dict tools fill), diagnosis (root_cause, validated_claims, validity_score), masking (masking_map), and loop control (investigation_loop_count, investigation_recommendations).
category: architecture
tags: [state, typeddict, langgraph]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/state/agent_state.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
---

# Investigation State Shape

## Conceptual buckets
The `AgentState` / `InvestigationState` TypedDict groups keys into roughly seven concerns:

| Bucket | Example keys |
|---|---|
| Identity | `org_id`, `user_id`, `user_email`, `organization_slug`, `thread_id`, `run_id` |
| Alert | `raw_alert`, `alert_name`, `pipeline_name`, `severity`, `is_noise`, `alert_source` |
| Routing | `kube_namespace`, `cloudwatch_log_group`, `error_message`, `log_query`, `eks_cluster`, `pod_name`, `deployment` |
| Integrations | `resolved_integrations`, `available_sources`, `available_action_names` |
| Planning | `planned_actions`, `plan_rationale`, `plan_audit`, `tool_budget` |
| Evidence | `evidence` (dict — varies per executed tool), `executed_hypotheses` |
| Diagnosis | `root_cause`, `root_cause_category`, `causal_chain`, `validated_claims`, `non_validated_claims`, `validity_score`, `investigation_recommendations`, `investigation_loop_count`, `remediation_steps` |
| Cross-cutting | `masking_map`, `mode`, `route` |

## Pure-function discipline
Each node receives the full state and returns a partial dict. Helper input/output dataclasses (`InvestigateInput`, `InvestigateOutput`) extract only the keys the node needs and produce only the keys it writes. This makes nodes unit-testable without LangGraph at all (see `app/pipeline/runners.py` for non-LangGraph runners).

## Why a TypedDict not a class
- LangGraph requires a TypedDict-compatible container so its checkpoint serializer can introspect.
- Mutating in place from a node is discouraged; always return a fresh dict slice.
- Use `cast(dict[str, Any], state)` when you must do dict-style assignment outside a node.

## Evolution gotcha
Adding a new state key is fine; renaming requires a migration in any persisted checkpoints (LangGraph stores them in PostgreSQL when you use `langgraph-api`). For dev, just bump a state schema version constant and clear old threads.
