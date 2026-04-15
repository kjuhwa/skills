---
slug: live-mode-aggregation-exceptions
category: arch
summary: LIVE mode reads raw data by default, but equalizer / multi-resource / TopN charts still aggregate raw at query time
confidence: medium
source:
  kind: project
  ref: lucida-measurement@bc4ed72
---

# Fact
The default routing for LIVE / REAL / RAW modes is "read the raw view, no aggregation". Three chart types are **exceptions** and aggregate raw data at query time even in LIVE mode:
- Equalizer chart (#114466)
- Multi-resource single chart (#114466 / #111914)
- TopN chart (#114466 / #112113)

Rationale: these chart types render many series simultaneously; raw points would produce visually unreadable charts and prohibitive payload sizes, so they apply `$group` + densification even in the "live" path.

# Evidence
- Commit `bf8388b` — "이퀄라이저 차트의 라이브 Mode도 집계가능하도록 수정"
- Commit `83b0872` — "멀티리소스 차트 라이브 Mode도 집계가능하도록 수정"
- Commit `c4f75ab` / `05bd26d` — "TOP N 차트의 라이브 Mode도 집계가능하도록 수정"
- Commit `f0a899d` (#112113) — "다중 리소스 성능 차트 LIVE 변경… 라이브일 때는 집계하지 않고 raw데이터 조회" — the opposite direction for the single-resource multi-line case, showing the distinction is real and has been re-litigated.

# How to apply
- When adding a new chart type, explicitly decide which LIVE-mode branch it belongs to and document it. Do not assume "LIVE = raw" universally.
- When touching routing logic in `MeasurementServiceImpl`, verify all three exception chart types still aggregate; a naive refactor to "LIVE ⇒ raw" regresses three production charts at once.

# Counter / Caveats
- The exception list has grown over time; treat it as discovered, not designed — future chart types may join.
