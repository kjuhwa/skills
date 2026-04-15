---
name: oz-license-file-placement-flip-flop
description: Vendor engines (OZ Report, Crystal, Jasper-Pro) often hard-code license file search paths — pin the path in the image and document it, or you will ship it broken repeatedly
type: pitfall
category: pitfall
source:
  kind: project
  ref: lucida-report@35a2a06
confidence: medium
---

## Fact
Vendor report engines typically resolve their license file from a search path that includes CWD, `$CATALINA_HOME/lib`, or a vendor-specific env var. When that path changes between dev, CI, on-prem, and SaaS deployments, the engine "starts" but fails at first report generation with cryptic license errors.

The lucida-report repo shows **six consecutive commits** bouncing the OZ license file between locations before settling: `f8626e9 → e06c9a0 → b00c649 → fd9c178 → f2144f0 → aec0ca9`.

## Why
Each deploy target has a different effective working directory: `bootRun` uses project root, Docker uses `/home/nkia/app`, the sidecar Tomcat uses `/usr/local/tomcat_oz`. The engine checks each path in a fixed order; whichever is first wins. Moving the license "to make dev work" breaks prod, and vice versa.

## How to apply
- Pin the license file to **one** absolute path inside the container image (e.g. `/usr/local/tomcat_oz/conf/license.dat`) and write a Dockerfile COPY line for it. Do not rely on classpath or CWD lookup.
- Document the path in a Dockerfile comment and a top-level ADR. Every new deploy target must match.
- Verify on container start: script checks the file exists and exits non-zero if missing — fail fast beats cryptic runtime errors.
- For multi-env testing (on-prem vs SaaS), mount the license via a volume, not bake-it-in, so keys can rotate without rebuilds.

## Evidence
- Commits (issue #89691): `aec0ca9 원복`, `f2144f0`, `f8626e9`, `e06c9a0`, `b00c649`, `fd9c178` — "보고서 라이선스 파일 위치 변경/원복" thrash over several days.

## Counter
- Not applicable to engines with env-var-based license loading (`LICENSE_KEY=...`); those avoid the path problem entirely. Prefer such engines when you have the choice.
