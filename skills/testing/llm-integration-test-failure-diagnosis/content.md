# LLM-based integration-test failure diagnosis

Integration-test logs are unstructured and high-volume, which makes manual triage the slow part of the loop. Google's Auto-Diagnose shows LLMs can summarize the log and propose a root cause well enough that developers adopt it in their review workflow. This skill describes how to build the equivalent.

## When to use

- Your integration test suite fails often enough that log triage is a measurable developer time sink.
- You already have a structured code-review or PR UI where findings can be posted inline.
- You can ship a per-failure payload (≤1–2MB) to an LLM without exfiltrating secrets.

## Steps

1. **Collect the failure payload.** Per failed test: final N log lines (or the last successful checkpoint → failure tail), stack trace, recent commits touching the changed files, test name and framework, and the test's assertion message.
2. **Redact before sending.** Strip credentials, internal hostnames, customer PII, bearer tokens. This is the highest-blast-radius integration point; a pre-flight redactor is non-negotiable.
3. **Structure the prompt.** Explicit sections: `CONTEXT`, `LOGS`, `FAILURE`, `RECENT_CHANGES`, `TASK`. Ask for a structured response (markdown with `summary`, `probable_root_cause`, `supporting_log_lines`).
4. **Cap log volume.** Truncate to the most recent ~30KB of text; over-long logs dilute the signal without improving accuracy.
5. **Post findings to the review UI.** At Google: inline into Critique. For GitHub: a PR review comment or a check-run annotation. Make the finding rejectable — "not helpful" is a first-class button.
6. **Measure helpfulness explicitly.** Track a "not helpful" rate per failure type; a working system should stay under ~10% of negative feedback.
7. **Bound the ranking claim.** Auto-Diagnose ranked #14 of 370 Critique finders. Your system is one voice among many — don't block merges on it.

## Success criteria

- ≥85% diagnosis accuracy on a manually-labeled holdout of ≥50 real failures before roll-out.
- "Not helpful" rate below 10% once live.
- End-to-end latency from test fail to posted finding under the developer's context-switch window (target: <1 minute).
- Redaction layer has its own unit tests — any change to it blocks deploy.

## Gotchas

- **Logs aren't sanitized.** Internal tests leak stack traces with internal hostnames, DB schemas, user IDs. Budget real engineering for the redactor before the LLM call.
- **Flaky tests pollute training signal.** If you fine-tune on past diagnoses, exclude flakes — their "root cause" is often "infra blip" and the model will overfit.
- **Cost scales with failure rate.** A regression that takes out 500 tests fires 500 diagnoses. Deduplicate by stack-trace fingerprint before calling the LLM.
- **Confidence calibration.** Ranking #14/370 means developers will still ignore findings they don't trust. Show the supporting log lines inline so they don't have to re-read the raw log.
- **Don't auto-close bugs from LLM diagnosis.** It's an assistive finding, not a verdict.

## Reference numbers from Auto-Diagnose (Google)

- Manual case study: 90.14% root-cause accuracy across 71 real-world failures.
- Production rollout: 52,635 distinct failing tests covered.
- Helpfulness: "Not helpful" feedback in 5.8% of cases.
- Ranking: #14 of 370 tools posting findings in Critique.

## Source

- https://arxiv.org/abs/2604.12108 — "LLM-Based Automated Diagnosis Of Integration Test Failures At Google" (2026).
- Research lane: skills_research trend survey, 2026-04-16 window.
