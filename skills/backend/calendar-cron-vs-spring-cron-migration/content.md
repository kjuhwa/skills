# Spring cron ↔ Quartz (calendar) cron migration

## Why this keeps biting people
Spring and Quartz look similar but have incompatible semantics:

| Field          | Spring (6-field) | Quartz (7-field)       |
|----------------|------------------|------------------------|
| Seconds        | yes              | yes                    |
| Minutes        | yes              | yes                    |
| Hours          | yes              | yes                    |
| Day-of-month   | yes              | yes                    |
| Month          | yes              | yes                    |
| Day-of-week    | 0–6 (0=Sun)      | 1–7 (1=Sun) + `?`      |
| Year           | —                | optional (1970–2099)   |

The killers are:
- Day-of-week numbering (0-index vs 1-index) — off by one, silently wrong.
- Quartz requires `?` in exactly **one** of day-of-month / day-of-week; Spring rejects `?`.
- `L`, `W`, `#` are Quartz-only.

## Recipe: user-authored cron → both engines
Store the **canonical form as Quartz 7-field**, derive Spring at read-time:

```java
public static String toSpringCron(String quartz) {
  String[] p = quartz.trim().split("\\s+");
  if (p.length < 6 || p.length > 7)
    throw new IllegalArgumentException("Expected 6 or 7 fields: " + quartz);

  // drop year if present
  String sec = p[0], min = p[1], hr = p[2], dom = p[3], mon = p[4], dow = p[5];

  // '?' not supported in Spring → convert to '*'
  if ("?".equals(dom)) dom = "*";
  if ("?".equals(dow)) dow = "*";

  // Quartz DOW 1..7 (Sun=1) → Spring 0..6 (Sun=0)
  dow = shiftDow(dow);

  return String.join(" ", sec, min, hr, dom, mon, dow);
}
```

## Gotchas
- Don’t convert on every schedule check — cache the derived form.
- Validate the round-trip in a unit test matrix of ≥20 real user expressions; edge cases (`0 0 12 1/2 * ?`, `0 15 10 ? * 6L`) reveal engine mismatches fast.
- Timezone: Spring resolves cron in the JVM default TZ unless you use `CronTrigger` with an explicit `ZoneId`. Always set it.

## Counter / Caveats
- If you only need fixed schedules, skip cron entirely — use `Duration`-based fixed-delay.
- Some tools (k8s CronJob) use classic 5-field. Don’t try to unify all three in one parser; convert at boundaries.

## Evidence from source project
Repeated production regressions on this conversion — commits `655c33f`, `d19e273`, `2f1d417`, `01daa93`, `5beebff`, `f07708b` all chased the same cron-dialect bug. Eventually the project moved canonical storage to Quartz/calendar form.
