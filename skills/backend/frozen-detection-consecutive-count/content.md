# Reference implementation notes

Source: `lucida-alarm` —
- `entity/FrozenCondition.java`

Key commit: `c443e701` — frozen detection requires `AlarmDampeningType.CONSECUTIVE` for Redis persistence to track the state between evaluations.
