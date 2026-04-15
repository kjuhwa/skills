# Gradle BootJar Conditional Archive Bundle

## Pattern
One `build.gradle` supports two outputs:
- **Cloud path**: `./gradlew bootJar` → single fat JAR, fed into `docker build`.
- **On-prem path**: `./gradlew assemble -PaddArchive=Y` → directory with fat JAR + externalized `application.yml` + `libs/` sidecar + timestamped zip and tar.

## Key pieces
```groovy
ext {
  addArchive = "N"
  currentDate_yyyyMMddHHmmss = new Date().format("yyyyMMddHHmmss")
}
bootJar {
  archiveFileName = "${artifactId}.jar"
  if (addArchive == "Y") {
    doLast { /* copy resources + jar into archivePath */ }
  }
}
tasks.register("createZip", Zip) { ... from archivePath }
tasks.register("createTar", Tar) { compression = Compression.GZIP; ... }
assemble {
  if (addArchive == "Y") { dependsOn "createZip", "createTar" }
}
```

## Steps
1. Decide the flag: CLI `-PaddArchive=Y` beats env var (CI-friendly).
2. Name archives with build timestamp — `${artifactId}_yyyyMMddHHmmss` — so customers can correlate with release notes.
3. Externalize `application.yml` into the archive dir, not inside the jar, so on-prem ops can edit without rebuilding.
4. Keep the cloud Dockerfile referencing the plain jar path (`build/libs/<artifact>.jar`) — don't let archive logic leak into it.

## Counter / Caveats
- `duplicatesStrategy = INCLUDE` on `processResources` is needed when sourceSets copy overlapping files — silent duplicate-file build failures otherwise.
- Don't conditional-skip `bootJar` itself; only toggle the `doLast` bundling. CI always wants the bare jar.
- If you also publish to Nexus, keep `jar { enabled = false }` — otherwise a broken plain jar gets published alongside the boot jar.
