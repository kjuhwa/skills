# Dual-JRE Docker for legacy report engine sidecar

## When to use
Your modern app targets JDK 21 (or latest LTS), but a vendor-bound component (e.g. OZ Report, Crystal Reports, legacy Jasper, old webMethods) requires **JRE 8**. Running two containers is impractical because the legacy engine is tightly coupled to the modern app (shared fonts, shared export path, same request lifecycle).

## Recipe
Base on a modern JRE Alpine image and add the legacy JRE via a local APK file (no network to legacy repos):

```dockerfile
FROM eclipse-temurin:21-jre-alpine

# Locale for non-ASCII rendering (Korean/CJK fonts in reports)
RUN apk update && apk add --no-cache musl-locales
ENV LANG=ko_KR.UTF-8 LC_ALL=ko_KR.UTF-8 LANGUAGE=ko_KR.UTF-8

# Install legacy JRE 8 from a locally committed APK
COPY ./java/openjdk8-jre-<version>.apk /tmp/
RUN apk add --no-cache /tmp/openjdk8-jre-<version>.apk

# Bundle a pre-configured sidecar Tomcat (tar’d) for the legacy engine
COPY tomcat_legacy/tomcat_legacy.tar /tmp/
RUN mkdir -p /usr/local/tomcat_legacy \
 && tar -xvf /tmp/tomcat_legacy.tar -C /usr/local/tomcat_legacy \
 && chmod +x /usr/local/tomcat_legacy/bin/*.sh

# Modern app
COPY build/libs/app.jar /home/app/
```

Start script launches sidecar first, then the Spring app:

```sh
# start.sh
/usr/local/tomcat_legacy/bin/catalina.sh start
exec java --add-opens java.base/java.net=ALL-UNNAMED -jar /home/app/app.jar
```

## Gotchas
- The modern app’s `JAVA_HOME` must **not** point at the legacy JRE. Pin `JAVA_HOME=/opt/java/openjdk` (temurin default path) in the start script.
- `--add-opens` is required on JDK 17+ when legacy engines reflect into `java.base`.
- APK file must match Alpine’s musl architecture. Don’t mix glibc-built JREs with `alpine`.

## Counter / Caveats
- If the legacy engine supports newer JREs, prefer a single-JRE image. Dual-JRE doubles image size (~200 MB).
- For true isolation, run legacy engine as a separate service; only use this pattern when co-location is required for shared volumes or network latency.
