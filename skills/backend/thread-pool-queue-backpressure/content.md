# Reference implementation notes

Source: `lucida-alarm` —
- `processor/MeasurementTopicQueueProcessor.java`

Config (application.yml):
```
queue-size-per-consumer: 10000
thread-count-per-consumer: 10
queue-usage-for-pause: 0.9
queue-usage-for-resume: 0.5
```

Pairs well with `kafka-batch-consumer-partition-tuning` — pause semantics only stay correct with a short `max-poll-records`.
