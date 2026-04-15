# Strategy SPI + Spring List→Map Auto-inject

## 문제
enum 기반 작업 유형이 많고 각 유형별 구현이 분리될 때, `switch (jobType)` 분기가 서비스에 퍼진다.

## 패턴
1. SPI 인터페이스에 `JobType getJobType()` (또는 `Key getKey()`) 선언.
2. 각 구현체는 `@Component` + 고유 `JobType` 반환.
3. 소비 쪽 생성자에서 `List<T>`를 받아 `Map<Key,T>`로 고정.

```java
public interface JobExecutor {
    JobType getJobType();
    JobExecutionResult execute(String orgId, RequestUnit unit);
}

@Component
public class ExecWorker {
    private final Map<JobType, JobExecutor> executors;

    public ExecWorker(List<JobExecutor> list) {
        this.executors = list.stream()
            .collect(Collectors.toMap(JobExecutor::getJobType, Function.identity()));
    }

    public void process(RequestUnit u) {
        executors.get(u.jobType()).execute(u.organizationId(), u);
    }
}
```

## 왜 좋은가
- 신규 구현 추가 시 Worker/Publisher 코드 수정 0.
- 중복 키가 있으면 기동 시점에 `IllegalStateException`으로 즉시 실패.
- Spring 리플렉션 없이 표준 DI 기능만 사용.

## 체크리스트
- [ ] SPI마다 `getKey()` 메서드 강제
- [ ] 소비 쪽은 `Map<K, T>`를 **final**로 잡아 불변화
- [ ] 중복 키 감지를 위해 `toMap`에 merge function 금지(기본으로 예외 발생)
- [ ] 테스트: 모든 enum 값이 Map에 존재하는지 검증 (`assertThat(map.keySet()).containsAll(EnumSet.allOf(Key.class))`)
