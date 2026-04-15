# Dev Controller Tenant Wrapping Helper

## 문제
`*ControllerDev.java` 10+ 파일에서 동일 패턴 반복:
```java
TenantContextHolder.INSTANCE.setTenantId(orgId);
String jwt = jwtTokenService.generate(...);
try { return real.call(jwt, ...); }
finally { TenantContextHolder.INSTANCE.clear(); }
```

## 리팩터
함수형 인터페이스 2종 + `@Component @Profile("local")` 헬퍼:
```java
@FunctionalInterface public interface DevAction<T> {
    T apply(String jwt) throws Exception;
}
@FunctionalInterface public interface DevRunnable<T> {
    T run() throws Exception;
}

@Component @Profile("local")
@RequiredArgsConstructor
public class DevControllerHelper {
    private final JwtTokenService jwt;

    public <T> T withTenantAndJwt(String orgId, DevAction<T> action) {
        TenantContextHolder.INSTANCE.setTenantId(orgId);
        try { return action.apply(jwt.generate(orgId)); }
        catch (Exception e) { throw new AutomationException(..., e); }
        finally { TenantContextHolder.INSTANCE.clear(); }
    }

    public <T> T withTenant(String orgId, DevRunnable<T> run) { ... }
}
```

Dev 컨트롤러 사용:
```java
return helper.withTenantAndJwt(orgId, jwt ->
    realController.create(jwt, body));
```

## 규칙
- Helper는 `@Profile("local")`로 프로덕션 빈 등록 차단.
- 예외는 helper 안에서 도메인 예외로 래핑 (각 Dev 컨트롤러에 try/catch 재등장 금지).
- JWT가 필요 없는 호출은 `withTenant` (JWT 없는) 오버로드 사용.
