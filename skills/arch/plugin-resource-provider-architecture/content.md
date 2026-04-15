# Plugin Architecture via ResourceProvider SPI

## When to use
Core product must monitor/manage heterogeneous resource types (network devices, storage, cloud, k8s, DB, SAP, etc.) and vendor support must be pluggable.

## Steps
1. Define a stable SPI: `ResourceProvider` interface exposing `getResourceDefinition()`, discovery, collection, command hooks.
2. Each plugin is a separate Gradle module producing a JAR implementing the SPI (`*-plugins-snmp`, `-aws`, `-kcm`, `-sap`, ...).
3. Core loads providers via Spring component scan over a well-known base package; plugins contribute their own `@Configuration` classes.
4. Package all plugin JARs into the deployable WAR via `includedJar` configuration (transitive=false) so the classpath stays flat.
5. Version the SPI — breaking changes to `ResourceProvider` force every plugin to update.

## Watch out for
- Don't let plugins reach into core internals; keep the SPI narrow.
- Classloader order matters in WAR — duplicate classes across plugins must be excluded (`DuplicatesStrategy.EXCLUDE`).
- Pair with `site-per-customer-override-modules` when customers need to replace a provider bean.
