---
version: 0.1.0-draft
tags: [arch, jvm, module, opens, java21, spring]
name: jvm-module-opens-java21-spring-kafka
description: Java 21 runs Spring Boot + Kafka/MongoDB clients under strict module access; two --add-opens flags are required or reflective serializers fail at runtime.
type: knowledge
category: arch
source:
  kind: project
  ref: lucida-meta@c55568a
confidence: medium
---

# Java 21 + Spring Boot: required --add-opens

## Fact

Running Spring Boot 3.5+ on Java 21 with Kafka/MongoDB clients requires, at minimum:

```
--add-opens java.base/java.net=ALL-UNNAMED
--add-opens java.base/java.lang=ALL-UNNAMED
```

Enforced in both `build.gradle` `bootRun.jvmArgs` and the production `Dockerfile` ENTRYPOINT. Missing either produces `InaccessibleObjectException` from reflection inside Kafka's `NetworkClient` or Spring's proxy/ReflectionUtils paths.

## Why it matters

- Absence is latent: the app starts, then fails *only* when the first Kafka producer/consumer touches a socket option, or when Spring proxies a specific bean late in startup.
- Do not "solve" it by downgrading to Java 17 — other dependencies (Lucida framework) now require 21.

## How to apply

- When bootstrapping a new Java 21 Spring Boot service that talks to Kafka or MongoDB, copy both `--add-opens` flags into every entry point: `bootRun`, Dockerfile, systemd unit, k8s manifest `JAVA_TOOL_OPTIONS`.
- When adding a new library that uses reflection on `java.base`, expect to add more `--add-opens`; treat the list as growing.
