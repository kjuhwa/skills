---
name: catalina-urlencoder-internal-api
description: org.apache.catalina.util.URLEncoder는 톰캣 내부 API — 컨테이너 교체/버전업에 깨지기 쉽다. java.net.URLEncoder 또는 Spring UriUtils 사용
type: knowledge
category: pitfall
source:
  kind: project
  ref: lucida-domain-automation@25108cc6
confidence: medium
---

# Fact
`org.apache.catalina.util.URLEncoder`는 Tomcat 내부 클래스로 Public API가 아니다. 톰캣 마이너 업그레이드, 다른 서블릿 컨테이너(Jetty/Undertow) 교체, GraalVM native 빌드 등에서 `ClassNotFoundException`/동작 차이를 유발한다.

# Why it matters
- 인코딩 규칙(예약 문자 집합, 공백 → `+` vs `%20`)이 `java.net.URLEncoder`와 미묘하게 달라 이식 시 실버그 가능.

# Evidence
- 커밋 `25108cc6`: "URLEncoder를 Catalina 내부 API에서 표준 Java API로 변경".
- `documents/code_improvement_report.md` §1-5.

# How to apply
- 쿼리 파라미터 값 → `java.net.URLEncoder.encode(value, StandardCharsets.UTF_8)`.
- 경로 세그먼트 → `org.springframework.web.util.UriUtils.encodePathSegment(value, UTF_8)`.
- Content-Disposition 파일명 → RFC 5987 `filename*` 권장 (Spring `ContentDisposition.builder()`).

# Counter / Caveats
- 둘 사이 인코딩 결과가 다를 수 있어, 다운스트림이 Catalina 동작을 전제하면 호환 테스트 후 배포.
