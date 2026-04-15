# Reference implementation notes

Source: `lucida-alarm` —
- `kafka/PolicyCheckEventConsumer.java`

Generalizes the lock/recheck layer of `kafka-debounce-event-coalescing`. Reusable in any multi-instance consumer that must serialize per-key work without losing concurrent triggers.

Lua release script:
```lua
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
else
  return 0
end
```
