---
version: 0.1.0-draft
tags: [pitfall, simpledateformat, not, thread, safe]
name: simpledateformat-not-thread-safe
description: SimpleDateFormat은 스레드 안전하지 않아 공유 인스턴스 사용 시 포맷 깨짐/예외 발생 — java.time.DateTimeFormatter로 교체
type: knowledge
category: pitfall
source:
  kind: project
  ref: lucida-domain-automation@a48c5cc1
confidence: high
---

# Fact
`java.text.SimpleDateFormat`은 내부 `Calendar` 상태를 파싱/포맷 중 변경한다. 필드/static으로 공유하면 멀티 스레드에서 엉뚱한 날짜 반환, `NumberFormatException`, `ArrayIndexOutOfBoundsException` 등이 불규칙 발생.

`java.time.format.DateTimeFormatter`는 **불변**이며 스레드 안전 — 그대로 공유 가능.

# Why it matters
- 서비스 전반 6개 파일에서 공유 SimpleDateFormat 사용이 있었고, 부하 상황에서 간헐적 포맷 오류로 이어졌다.
- 에러가 드물고 재현이 어려워 오래 묻히는 종류의 버그.

# Evidence
- 커밋 `a48c5cc1`: "SimpleDateFormat → DateTimeFormatter 마이그레이션", `src/main`에서 완전 제거.
- `documents/code_improvement_report.md` §2-4.

# How to apply
- 새 코드는 무조건 `DateTimeFormatter` + `java.time` API.
- 패턴 문자가 일부 다름(`yyyy`→`uuuu` 권장, `a`/`h` 등 주의). 기존 로그 포맷 호환 필요 시 테스트로 검증.
- Locale이 필요하면 `DateTimeFormatter.ofPattern(pattern, Locale.KOREA)` 명시.

# Counter / Caveats
- 단일 스레드 짧은 수명(메서드 로컬)에서는 SimpleDateFormat도 기능적으로 동작 — 그래도 신규 코드에선 쓰지 않는다.
