# Reference implementation notes

Source: `lucida-alarm` —
- `entity/BaselineCondition.java` — enums + evaluation shape
- `MeasurementCollectProcessor` — `getBaselineHourValue()`, `getBaselineDayValue()`

Requires a pre-aggregated stats store; the lookup path must be indexed on `(resourceId, measurementId, timeBucket)`.
