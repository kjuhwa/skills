---
version: 0.1.0-draft
name: multi-source-alert-routing-rationale
summary: OpenSRE's detect_sources() function illustrates a robust pattern for routing alerts across heterogeneous observability backends — accept many alias spellings, gate each backend on alert-source provenance, and merge nested-vs-top-level annotations so LLM-extracted enrichments fill gaps.
category: integration
tags: [alert-routing, observability, multi-source, normalization]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/nodes/plan_actions/detect_sources.py
imported_at: 2026-04-18T00:00:00Z
confidence: high
---

# Multi-Source Alert Routing — Rationale

## The challenge
A single agent must respond to alerts coming from Grafana, Datadog, Honeycomb, Coralogix, CloudWatch, EKS, PagerDuty, and Slack — each with its own JSON schema and field-naming conventions. The planner needs to know which observability backends to query for *this specific alert* without firing all of them blindly.

## The solution shape
`detect_sources(raw_alert, context, resolved_integrations)` returns a `dict[str, dict]` keyed by backend name. Each backend entry contains the parameters needed to query it (endpoint, region, namespace, log_query, etc.). The planner then sees `available_sources` and selects tools that match.

## Three rules that make it work
1. **Alias-tolerance per resource**: `cloudwatch_log_group OR log_group OR cloudwatchLogGroup OR lambda_log_group` — pick whichever exists. Same pattern repeats for s3_bucket, lambda_function, eks_cluster, db_instance, etc.
2. **Provenance gating**: Each backend integration is only included when `alert_source` matches it OR is unknown. `if grafana_int and not (alert_source in ("grafana", "")): grafana_int = None`. Prevents spurious cross-platform queries.
3. **Top-level + nested merge**: `{**nested_annotations, **{k:v for k,v in raw_alert.items() if v and k not in nested}}` — LLM-extracted enrichments at top level fill gaps without overriding original annotations.

## Why structural URL detection is needed
When `alert_source` isn't explicitly set, fall back to inspecting `externalURL`/`generatorURL`. A Grafana Alertmanager webhook always has `externalURL` pointing to Grafana. This catches alerts where the user didn't configure the source field.

## Backend coverage in OpenSRE
Currently detected: cloudwatch, s3, s3_audit, s3_processed, local_file, lambda, tracer_web, aws_metadata, grafana, datadog, honeycomb, coralogix, eks, github, openclaw, gitlab, vercel, sentry, mongodb, postgresql, mongodb_atlas, mariadb, opsgenie, jira, mysql.

## Trade-offs
- Pro: Adding a new backend is local — one new block in `detect_sources` plus a new tool module.
- Con: 950+ lines of imperative parsing in one file. Could be modularized (per-backend extractors) but the current shape keeps the routing logic visible in one place.
- Con: Hard-codes alias lists. A new alert source with a novel field name needs a code change. Mitigated by the LLM extraction step (`extract_alert`) which flattens common variants up to the top level.
