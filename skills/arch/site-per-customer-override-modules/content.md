# Site-Per-Customer Override Modules

## When to use
Enterprise product delivered to many customers, each with 5–30% bespoke requirements (auth, notification channels, report layouts, resource overrides) that would pollute core if feature-flagged.

## Steps
1. Create one Gradle module per customer (`<product>-site-<customer>`) included via `settings.gradle`.
2. Site module depends on core + relevant plugins; contributes additional `@Configuration` classes and Spring bean overrides (`@Primary` or profile-scoped).
3. Build picks exactly one site module per deployable (selected via build property or separate launcher WAR).
4. Keep customer-specific assets (resource bundles, logos, SAML metadata) inside the site module only.
5. Core + plugins stay customer-agnostic; PRs that leak customer names into core are rejected.
6. Common hotfix flow: branch per ticket → fix in core/plugin if general, fix in site module if customer-only → merge into LTS branch.

## Watch out for
- Scales in file count (the source project has 70+ site modules). Invest in templating or a `site-template` starter.
- "Common site" patterns tempt you to duplicate — extract into core/plugin instead.
- CI must build every site module to catch cross-module breakage early.
