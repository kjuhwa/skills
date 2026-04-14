# JWT Access + Refresh Token Rotation (Spring Boot 3)

## Problem

You need stateless JWT auth in a Spring Boot 3 REST API with:
- Short-lived access tokens (minutes) so revocation has a bounded window.
- Long-lived refresh tokens (days) so users aren't logged out constantly.
- Clean integration into the Spring Security filter chain.
- A token "type" claim so a refresh token can't be misused as an access token.

Common mistakes:
- Adding the filter in the wrong position (before `SecurityContextHolderFilter` instead of before `UsernamePasswordAuthenticationFilter`).
- Forgetting `SessionCreationPolicy.STATELESS` → server creates sessions anyway.
- Using `Keys.hmacShaKeyFor(secret.getBytes())` with a < 256-bit secret → jjwt 0.12 throws at startup.
- Not disambiguating access vs refresh tokens → a leaked refresh token lets an attacker hit any protected endpoint.

## Pattern

Three collaborating components:

1. **`JwtTokenProvider`** — generates & validates tokens. Embeds a `type` claim (`"access"` / `"refresh"`) and different expiries. Uses `io.jsonwebtoken:jjwt-api:0.12.x` (runtime adds `jjwt-impl` and `jjwt-jackson`).

2. **`JwtAuthenticationFilter extends OncePerRequestFilter`** — extracts `Authorization: Bearer <token>`, validates, rejects if `type != "access"`, loads `UserDetails`, populates `SecurityContext`. Does **not** throw on missing/invalid token — just skips and lets the chain decide (unauthenticated endpoints should still work).

3. **`SecurityConfig`** — disables CSRF, sets stateless session, registers the filter **before** `UsernamePasswordAuthenticationFilter`, whitelists `/auth/login`, `/auth/refresh`, `/auth/register`.

Refresh endpoint flow: validate refresh token → check `type == "refresh"` → issue **new** access + refresh pair (rotate both, invalidate old refresh server-side if you track them).

## Example (sanitized)

```java
// build.gradle.kts
dependencies {
    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")
}
```

```java
@Component
public class JwtTokenProvider {
    private final SecretKey key;
    private final long accessTtlMs;   // e.g. 15 * 60_000
    private final long refreshTtlMs;  // e.g. 7 * 24 * 3600_000

    public JwtTokenProvider(@Value("${app.jwt.secret}") String secret,
                            @Value("${app.jwt.access-ttl-ms}") long accessTtlMs,
                            @Value("${app.jwt.refresh-ttl-ms}") long refreshTtlMs) {
        // Secret MUST be >= 32 bytes. Generate via `openssl rand -base64 48`.
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTtlMs = accessTtlMs;
        this.refreshTtlMs = refreshTtlMs;
    }

    public String generateAccess(Long userId) { return build(userId, "access", accessTtlMs); }
    public String generateRefresh(Long userId) { return build(userId, "refresh", refreshTtlMs); }

    private String build(Long userId, String type, long ttlMs) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("type", type)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(ttlMs)))
                .signWith(key)
                .compact();
    }

    public Claims parseAndRequireType(String token, String expectedType) {
        Claims c = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        if (!expectedType.equals(c.get("type"))) {
            throw new JwtException("wrong token type");
        }
        return c;
    }
}
```

```java
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtTokenProvider jwt;
    private final UserDetailsService users;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                Claims c = jwt.parseAndRequireType(header.substring(7), "access");
                UserDetails u = users.loadUserByUsername(c.getSubject());
                var auth = new UsernamePasswordAuthenticationToken(u, null, u.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (JwtException ignored) {
                // fall through; downstream auth entry point handles it
            }
        }
        chain.doFilter(req, res);
    }
}
```

```java
@Configuration @EnableWebSecurity
public class SecurityConfig {
    @Bean SecurityFilterChain chain(HttpSecurity http, JwtAuthenticationFilter jwtFilter) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/auth/login", "/auth/refresh", "/auth/register").permitAll()
                .anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
```

## When to use

- Any Spring Boot 3 API that needs stateless auth.
- SPA / mobile clients where you can't rely on HttpOnly session cookies.
- Microservices where the JWT is passed across services.

## When NOT to use

- Same-origin server-rendered apps — plain session cookies are simpler and safer.
- Very long token lifetimes (days for access tokens) — defeats the point; use sessions.

## Pitfalls

- **Secret length**: jjwt 0.12's `Keys.hmacShaKeyFor` throws at boot if the secret is < 256 bits. Don't hardcode short dev secrets.
- **Filter position**: `addFilterBefore(..., UsernamePasswordAuthenticationFilter.class)` is the common correct slot. Wrong slot → `SecurityContext` isn't populated when downstream filters need it.
- **Type claim**: without it, a leaked refresh token grants full API access. Always enforce `type == "access"` in the auth filter.
- **Stateless session**: forgetting `SessionCreationPolicy.STATELESS` means Spring still creates sessions, which leak memory and break horizontal scaling.
- **Refresh rotation**: on refresh, issue a *new* refresh token and (ideally) invalidate the old one server-side. Otherwise a stolen refresh token lives until its natural expiry.
- **Clock skew**: on distributed setups, allow `.clockSkewSeconds(30)` when parsing or users at the edge get spurious rejections.

## Related

- `frontend/axios-refresh-queue-zustand` — client-side refresh queue that pairs with this server pattern.
