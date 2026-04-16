---
name: health-check-visualization-pattern
description: Three-tier visual encoding for service health — traffic-light palette, temporal pulse lines, and calendar heatmaps on a dark operations background.
category: design
triggers:
  - health check visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# health-check-visualization-pattern

Health-check dashboards converge on a strict three-color semantic palette: green (#6ee7b7) for healthy/passing, amber (#fbbf24) for degraded/warning, and red (#f87171) for down/critical. This palette must be applied consistently across every visual element — status dots, border accents, SVG ring strokes, canvas line colors, and heatmap cells. The background is always a dark ops-console tone (#0f1117 body, #1a1d27 cards) so the traffic-light colors pop without competing chrome. Every health widget should resolve to one of exactly three states; introducing a fourth (e.g., "unknown") requires a neutral slab (#22262e) that reads as "no data" rather than a new severity.

The three apps demonstrate three complementary temporal encodings that together form a complete health visualization stack. The heartbeat monitor uses a real-time Canvas pulse line (200-point rolling window, 500ms tick) with dynamic stroke color that flips red the instant latency crosses a threshold — this is the "now" view. The system-vitals ring uses inline SVG donut arcs with stroke-dasharray proportional to utilization percentage and a three-band color ramp (green < 60, amber 60-85, red > 85) — this is the "gauge" view for capacity metrics. The uptime heatmap uses a service-by-day grid of colored cells with hover tooltips showing exact uptime percentage — this is the "history" view. A reusable health dashboard should compose all three: real-time pulse for the selected service, ring gauges for aggregate resource metrics, and a heatmap for SLA-period history.

Interaction patterns are minimal by design: click-to-select a service (heartbeat), hover-to-inspect a cell (heatmap), and auto-scrolling log (vitals ring). The log component — prepend-newest, cap at N entries, monospace font — recurs as a universal "event feed" alongside any health visualization. Tooltips are fixed-position, pointer-events:none overlays that show service name, timestamp, status, and uptime percentage. The CSS transition on cell hover (scale 1.5x) provides spatial focus without modal interruption. All rendering is zero-dependency: vanilla Canvas 2D for time-series, inline SVG for gauges, and plain DOM for grids — no charting library required.
