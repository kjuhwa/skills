---
slug: jacoco-sonar-exclusion-policy
category: decision
summary: Single exclusion list drives Jacoco + Sonar + test excludes; generated/boilerplate code never counts toward coverage
confidence: medium
source:
  kind: project
  ref: lucida-measurement@bc4ed72
links:
  - querydsl-q-class-exclusion-pattern
---

# Fact
Coverage-exclusion scope is defined **once** in `build.gradle` (`exclusionPatterns`) and reused for Jacoco report, Jacoco verification, Sonar `sonar.exclusions`, and Sonar `sonar.coverage.exclusions`. Excluded: Avro-generated, Querydsl Q-classes, DTO/entity, config/exception boilerplate, Kafka listeners, util, application bootstrap. The policy is intentional — covering generated and boilerplate code would inflate % without testing logic.

# Evidence
- `build.gradle` lines 27–43 (single list), 305–320 (Jacoco apply), 332–342 (Sonar apply)
- Commit `6f098e2` — "Fix: 정적 분석 build.gradle 수정 Content: dto 및 domain 하위패키지 제외"
- Commits `fabc314`, `2197782`, `6c01c8f`, `c06741b` — successive refinements to meet SonarQube results

# How to apply
- New generated-code packages (avro, proto, openapi) must be added to `exclusionPatterns`, not annotated per-class.
- Don't blanket-exclude `**/controller/**` — only test-only controllers (`Test*`) and error handlers; real controllers must be covered.
- If Jacoco and Sonar disagree on numbers, first check that both are reading the shared list (common drift source).

# Counter / Caveats
- An exclusion list is a blunt instrument; if a legitimate class matches a pattern it silently disappears from coverage. Audit the list when a coverage number looks surprisingly good.
