---
version: 0.1.0-draft
name: alert-extraction-single-llm-call-pattern
summary: Combine alert noise-classification and field-extraction in one LLM call with structured output — extracting alert_name, pipeline_name, severity, alert_source, namespace, error_message, log_query, eks_cluster, pod_name, deployment, plus an is_noise bool — halving cost vs a two-call setup.
category: reference
tags: [llm, alert-extraction, structured-output, optimization]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/nodes/extract_alert/extract.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
---

# Alert Extraction — Single-LLM-Call Pattern

## The pattern
A common anti-pattern: "first classify if this is noise, then if not noise, extract fields". Two LLM calls, 2x cost, 2x latency. OpenSRE does both in one call:

```python
class AlertDetails(BaseModel):
    is_noise: bool
    alert_name: str
    pipeline_name: str
    severity: str
    alert_source: str | None = None
    kube_namespace: str | None = None
    cloudwatch_log_group: str | None = None
    error_message: str | None = None
    log_query: str | None = None
    eks_cluster: str | None = None
    pod_name: str | None = None
    deployment: str | None = None
```

The prompt explicitly states the is_noise rule ("casual chat, greetings, trivial messages, replies to existing investigations") and "when in doubt, is_noise=false". Then asks for all fields on the same output.

## When the call fails
A fallback `_fallback_details(state, raw_alert)` does best-effort extraction from common Alertmanager fields (`labels.alertname`, `annotations.pipeline_name`, etc.) without an LLM. Ensures the agent proceeds even if the LLM is rate-limited.

## When alerts are dicts vs strings
`_format_raw_alert(raw_alert)` handles three cases:
1. Already a string → pass through.
2. Dict with a `text` field (Slack alerts) → use that human-readable field.
3. Otherwise → `json.dumps(raw_alert, indent=2, sort_keys=True)`.

`sort_keys=True` stabilizes the prompt so identical inputs produce identical cache keys in prompt caching.

## Why alert_source matters
Downstream `detect_sources` uses `alert_source` to suppress backends that didn't fire the alert. Extracting it here — from URL heuristics in the alert body — means the planner narrows the tool set early instead of wasting Datadog calls for a Grafana alert.

## The heuristic instructions inside the prompt
Every field has a disambiguation hint:
- "alert_source: grafana if URL mentions grafana.net or Grafana alerting..."
- "kube_namespace: from kube_namespace:tracer-test annotation..."
- "log_query: usually the 'Search logs:' or 'monitored query' line..."

These hints turn a general-purpose model into a reliable alert parser. Cost: ~1000 tokens of system prompt per call. Benefit: no need for a dedicated alert-parser model.
