---
version: 0.1.0-draft
tags: [arch, env, override, last, wins, chain]
name: env-override-last-wins-chain
category: arch
summary: Environment variables resolve across four sources with "last wins" precedence.
source:
  kind: project
  ref: lucida-account@f1efa2ba
---

# Env Variable Resolution: Four-Layer Last-Wins Chain

**Fact.** Precedence (each layer overrides the prior):
1. External system env (e.g., `deployment_patch.yml` in lucida-deployment).
2. `.env` file in the JAR's directory.
3. `application.env` packaged in the classpath (inside JAR).
4. `application.env` file in the JAR's directory.

**Why.** Supports SaaS (deployment YAML drives env) and on-prem (ops edit `.env` next to the JAR) from the same binary. Putting classpath `application.env` in the middle lets defaults ship in the JAR while external files override them.

**How to apply.** Document every env var in the classpath `application.env` with sane defaults. Never commit prod secrets to classpath — they'd become the default. When diagnosing "why is this value X?", walk the chain in order; the most common gotcha is a stale `.env` next to the JAR overriding a corrected `deployment_patch.yml`.
