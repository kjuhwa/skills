---
version: 0.1.0-draft
tags: [decision, cors, allow, credentials, star, origin]
name: cors-allow-credentials-star-origin
description: 서비스 레벨 allowCredentials=true + allowedOriginPatterns("*") 유지 — 엣지(Traefik/Istio)에서 CORS를 제어하는 아키텍처 전제
type: knowledge
category: decision
source:
  kind: project
  ref: lucida-domain-automation@b0cf1adb
confidence: medium
---

# Decision
`TWebConfig`는 `allowCredentials(true) + allowedOriginPatterns("*")`를 유지한다. 일반적으로 보안 위험 패턴이지만, 이 플랫폼은 **엣지 프록시(Traefik/Istio)가 CORS/Origin 검증을 수행**하고 내부 서비스는 클러스터 내부 트래픽만 처리한다는 전제.

# Why
- 모든 마이크로서비스에 도메인 화이트리스트를 중복 관리하면 변경 비용이 커지고 누락 위험.
- 프로덕션 경로에서 외부 브라우저가 서비스 포트에 직접 닿는 구성은 없음.
- 플랫폼 전체 일관성 (다른 lucida-domain-* 서비스 동일 정책).

# Evidence
- `documents/code_improvement_report.md` §1-3 상태 "N/A — 앞단에 Traefik/Istio가 CORS 제어".

# How to apply
- 이 전제가 깨지는 배포(서비스를 퍼블릭 노출, BFF 없음)에서는 반드시 서비스 레벨 CORS 재설정.
- 리뷰에서 "CORS를 왜 이렇게?"가 나오면 **엣지 책임**을 명시적으로 기록.
- 신규 서비스 생성 시 이 정책을 복사하는 것은 **엣지 설정 확인 후**에만.

# Counter / Caveats
- 로컬 개발에서 엣지를 거치지 않고 브라우저가 직접 호출하는 시나리오는 이 정책이 "좋은 보호"를 제공하지 않는다 — 운영 시 보안 책임이 엣지에 있다는 것만 의미.
