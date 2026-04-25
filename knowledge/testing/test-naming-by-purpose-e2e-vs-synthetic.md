---
version: 0.1.0-draft
name: test-naming-by-purpose-e2e-vs-synthetic
summary: OpenSRE keeps semantic test-catalog naming so e2e (real cloud-backed scenarios) vs synthetic (LLM-based fixture-only) and local vs cloud boundaries stay obvious by directory layout, with dedicated Makefile entrypoints for each.
category: testing
tags: [test-organization, e2e, synthetic, naming]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: tests/README.md
imported_at: 2026-04-18T00:00:00Z
confidence: medium
---

# Test Naming by Purpose

## The directories
- `tests/synthetic/` — LLM-based scenarios that consume fixtures (no live infra). Marked `@pytest.mark.synthetic`. Non-deterministic.
- `tests/e2e/` — real cloud-backed scenarios. Subdirectories per platform (`kubernetes/`, `cloudwatch_demo/`, `upstream_lambda/`, `upstream_apache_flink_ecs/`, `upstream_prefect_ecs_fargate/`, `datadog/`, `crashloop/`, `grafana/`, `rca/`).
- `tests/deployment/` — deployment-layer tests (`bedrock/`, `langsmith/`, `vercel/`, `ec2/`).
- `tests/cli/`, `tests/services/`, `tests/integrations/`, `tests/nodes/`, ... — unit/integration tests organized by code module.
- `tests/shared/` — cross-cutting helpers.
- `tests/fixtures/` — JSON test alerts and other static data.

## Why this matters
- A new contributor can immediately tell which tests need cloud credentials vs which run on CI vs which are LLM-flaky.
- CI can target `tests/` minus `tests/synthetic/` and `tests/e2e/` for fast deterministic runs.
- Per-platform directories under `tests/e2e/` mean adding a new cloud (e.g. Azure) creates exactly one new directory; everything else stays.

## Makefile targets reflect the layout
```makefile
test            -> fast unit + Prefect cloud E2E
test-full       -> the whole thing
test-cov        -> unit/integration with coverage (excludes synthetic, e2e/kubernetes_local_alert_simulation)
test-cli-smoke  -> tests/cli_smoke_test.py only
test-rca        -> markdown alert files in tests/e2e/rca/
test-synthetic  -> pytest -m synthetic tests/synthetic/
test-rds-synthetic -> tests/synthetic/rds_postgres specifically
test-grafana    -> tests/e2e/grafana_validation/
```

## The "vendored upstream code" exception
`tests/e2e/upstream_*/pipeline_code/**` directories are genuine third-party code (Lambda handlers, Flink jobs, Prefect flows) included for end-to-end testing. The ruff config exempts them entirely (`["S"]`) because they're not OpenSRE's to fix.

## Generalize
Any project with mixed test categories (deterministic vs non-deterministic, mocked vs cloud-backed, unit vs integration vs e2e) benefits from explicit directory naming + matching Makefile targets. It removes the "which test should I run?" cognitive overhead at every commit.
