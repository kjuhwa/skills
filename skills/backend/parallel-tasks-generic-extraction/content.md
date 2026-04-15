# 병렬 작업 호출 중복 → 제네릭 추출

## 문제
```java
List<Callable<X>> tasks = resources.stream()
    .map(r -> (Callable<X>)() -> doX(r)).toList();
List<Future<X>> futs = executor.invokeAll(tasks, timeout, unit);
List<X> ok = new ArrayList<>(); List<String> fail = new ArrayList<>();
for (int i=0; i<futs.size(); i++) {
    try { ok.add(futs.get(i).get()); }
    catch (Exception e) { fail.add(resources.get(i).getId()); }
}
```
같은 블록이 `onlyTransfer`, `onlyGather`, `transferAndGather` 3곳에 ~35줄씩 복붙.

## 리팩터
```java
public record ParallelExecutionResult<T>(List<T> succeeded,
                                         List<String> failedIds) {}

@FunctionalInterface
public interface TaskFactory<T> {
    Callable<T> create(Document resource);
}

public <T> ParallelExecutionResult<T> executeParallelTasks(
        List<Document> resources, TaskFactory<T> factory,
        long timeout, TimeUnit unit) {
    // invokeAll + 결과 분류 한 곳
}
```
호출부는 1~3줄로 축소:
```java
var result = executeParallelTasks(resources, r -> () -> transfer(r), 300, SECONDS);
```

## 규칙
- 실패 식별자는 `resourceId` 등 **안정된 키**로 수집 (Future 인덱스 의존 금지, reorder 시 깨짐).
- 타임아웃과 단위는 호출자가 결정 (작업별 다름).
- `Thread.currentThread().isInterrupted()` 시 즉시 재throw, 삼키지 말 것.
- 단일 호출(1회용)에는 추출하지 말 것 — 과잉 추상화.
