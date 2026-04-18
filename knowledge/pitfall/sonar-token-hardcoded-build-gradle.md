---
version: 0.1.0-draft
tags: [pitfall, sonar, token, hardcoded, build, gradle]
name: sonar-token-hardcoded-build-gradle
title: build-gradle-secret-and-insecure-protocol
description: Hardcoded SonarQube login token in build.gradle plus `allowInsecureProtocol = true` on an internal Nexus are two common DevSecOps anti-patterns to fix together
category: pitfall
confidence: high
source:
  kind: project
  ref: lucida-realtime@336a1e2
---

# Secrets in build.gradle + Insecure Nexus

## Fact
Two issues commonly co-occur in internal Java projects:
1. A SonarQube login token committed in plaintext inside `build.gradle` under `sonar { properties { property "sonar.login", "..." } } }`.
2. The internal Nexus repository declared with `allowInsecureProtocol = true` — Gradle would otherwise refuse a plain-`http://` dependency repository.

Observed in lucida-realtime's `build.gradle`.

## Why it's a pitfall
- The token is in git history forever — rotation requires a new token AND a history rewrite or confession to the auditor.
- `allowInsecureProtocol = true` permits a MitM on the artifact supply chain. An attacker on the internal network can inject a malicious JAR via the non-TLS Nexus and it will be trusted by every build.
- Both together: the token may be valid against a production SonarQube instance and grants scan-result write access.

## How to apply (the fix)
For tokens / credentials:
- Move to `~/.gradle/gradle.properties` (per-developer) and/or CI env vars. Read via `project.findProperty("sonarLogin") ?: System.getenv("SONAR_LOGIN")`.
- Add the real file to `.gitignore` and commit a `gradle.properties.example`.
- Rotate the existing token immediately — it is considered compromised the moment it hits a public branch or shared worktree.

For insecure Nexus:
- Fix the actual TLS on the Nexus server (self-signed is fine — distribute the CA).
- Remove `allowInsecureProtocol = true` and use `https://`.
- If TLS truly cannot be fixed short-term, at minimum pin artifact checksums via Gradle's dependency verification (`gradle/verification-metadata.xml`).

## Counter / Caveats
- Build-internal tokens with scan-only write permission are lower-risk than ops tokens, but still bad practice — grep your build scripts for `login`, `token`, `password`, `apikey`.
- Dependency verification adds friction; start with a manifest of `sha256`s of your direct deps rather than the full transitive tree.

## Evidence
- `build.gradle` line ~358: `property "sonar.login", "sqa_..."`.
- `build.gradle` line ~109: Nexus repository with `allowInsecureProtocol = true`.
