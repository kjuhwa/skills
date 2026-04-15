# Kafka 분산 작업 실행 프레임워크 (Engine)

## 언제 쓰나
- 단일 호출 Pod가 `invokeAll`로 N개 작업을 동기 처리 → Pod 분산 불가, 글로벌 스레드풀 포화, RejectedExecutionException.
- 1개 장비 장시간 블로킹이 전체 타임아웃에 영향.
- Consumer Group으로 Pod 수평 확장을 원할 때.

## 파이프라인
```
Publisher.dispatch(jobId, resources)
  ├─ Preparer.prepare()            (1회 사전 준비 — 예: 스크립트 압축/업로드)
  ├─ ProgressTracker.startTracking()
  └─ 장비별 Kafka publish (쓰로틀링: N건마다 sleep)

Kafka Consumer Group (여러 Pod)
  └─ Consumer → QueueManager.offer(unit)

Worker (풀 스레드)
  └─ take() → AdmissionControl.tryAcquire()
       ├─ 실패 → QueueManager.reOffer()  (back-pressure)
       └─ 성공 → Executor.execute() → ResultHandler.handle()
                 → ProgressTracker.recordCompletion()
                 → finally: release() + TenantContext.clear()
```

## 핵심 구성요소
1. **Strategy SPI** — `JobPreparer`, `JobExecutor`, `JobResultHandler` (각 `JobType getJobType()` 선언).
2. **AdmissionControl** — `AtomicInteger` 기반 동시 실행 제한.
   ```java
   int cur = active.incrementAndGet();
   if (cur > max) { active.decrementAndGet(); return false; }
   return true;
   ```
3. **범용 Avro 래퍼** — `DataAvro{jsonData, jsonDataClass}` 하나로 통일. 메시지 DTO(`RequestUnit`)는 `record`로 JSON 직렬화.
4. **ProducerRecord key=null + sticky partitioner** — organizationId는 헤더로. 파티션 분산은 batch.size 기준 자연 분산에 맡긴다.
5. **쓰로틀링** — `throttle-batch-size`건마다 `throttle-delay-ms` sleep.
6. **Feature flag 공존** — `@ConditionalOnProperty("automation.engine.enabled")`로 신규/기존 핸들러 동시 공존.

## SPI 자동 매핑 (Spring)
```java
public ExecWorker(List<JobExecutor> executors) {
  this.executors = executors.stream()
      .collect(toMap(JobExecutor::getJobType, identity()));
}
```

## 체크리스트
- [ ] `JobType` enum + `RequestUnit` record + `JobExecutionResult` record
- [ ] SPI 3종 인터페이스
- [ ] Publisher/Consumer/Worker/QueueManager/AdmissionControl/ProgressTracker
- [ ] DataAvro 범용 래퍼 (별도 Avro 스키마 증식 방지)
- [ ] `@ConditionalOnProperty` 로 기존 경로와 공존
- [ ] Worker에서 `try { TenantContext.set(...) } finally { release; clear }`
- [ ] Kafka 토픽 상수화 (`TopicConstants.ENGINE_JOB_RESOURCE`)
- [ ] 진행 추적: 장비별 완료/실패 + 전체 완료 판단 + onAllCompleted 콜백

## 드롭 경고 — 하지 말 것
- JobType별 별도 Avro 스키마 정의 (DataAvro 하나로 통일).
- ProducerRecord key=organizationId (소규모에서 한 파티션 집중). key=null 고수.
- Worker에서 `TenantContext.clear()` 누락 — 스레드 재사용 시 누수.
