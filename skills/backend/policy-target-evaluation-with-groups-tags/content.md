# Reference implementation notes

Source: `lucida-alarm` —
- `entity/CommonAlarmDefinition.java` — selector field shape + `evaluateConf()`
- `service/CommonAlarmPolicyCheckerImpl.java` — orchestrator
- `service/PolicyCheckDebouncer.java` — debounced trigger of re-evaluation

Design doc: `common-alarm-policy-target-allocation-design.md`.
Test matrix: `common_alarm_target_test_cases.md` (SYSTEM-group, SMART-group, tag-filter, exclusion cross-product).
