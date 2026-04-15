# Spring Profile Datasource Activation

## When to use
Same build artifact ships to multiple environments and must pick its DB, Hibernate, and logging config at startup.

## Steps
1. Wire `spring.profiles.active` from a JVM system property set by the launcher task (e.g., Gradle `jettyRun` sets `-Dspring.profiles.active=development`).
2. Organize `config.properties` (or profile-specific overlays) so the active profile's values win.
3. Inject properties into `@Configuration` with `@Value("${hibernate.dialect}")`, `@Value("${hibernate.connection.url}")`, etc.
4. Let the same `CoreConfiguration` class serve every env — no `if(profile==prod)` branching in code.
5. For local dev use an embedded DB (H2) as a zero-config default profile.

## Watch out for
- Never bake credentials into a `config.properties` committed to git; externalize or encrypt.
- Profile collisions (multiple active profiles) silently merge — document the intended single-profile rule.
