---
name: asm-based-classloader-instrumentation-caveats
summary: ASM-based JVM agents miss Java 8+ lambda forms, annotation-processor classes, and Spring proxies unless explicitly handled; misses manifest as XLog gaps or skipped trace points
category: pitfall
confidence: high
source_type: extracted-from-git
source_url: https://github.com/kjuhwa/scouter
source_ref: master
source_commit: 126bb19f07d1fe4fe915eb408c381e2c140cc94c
source_project: scouter
tags: [asm, pitfall, instrumentation, lambda, jvm]
---

## Fact

Java 8+ lambdas and method references compile to synthetic classes materialized at runtime by the JVM's LambdaMetafactory — these bypass a naive `ClassFileTransformer` because the class name doesn't match any pattern an agent would register. Scouter ships a dedicated `LambdaFormTransformer` to catch them. Similar issues arise with Spring's runtime CGLIB proxies (class name has `$$EnhancerBySpringCGLIB`), annotation processors that generate post-compile classes, and agents that chain (order of transformers matters; a second agent instrumenting the same method can produce broken bytecode). Scouter mitigates with per-hook config flags (`hook_async_enabled`, etc.) so problem hooks can be turned off in production.

## Evidence

- `scouter.agent.java/src/main/java/scouter/agent/AgentTransformer.java`
- `scouter.agent.java/src/main/java/scouter/agent/LambdaFormTransformer.java`

## How to apply

If you're writing a JVM agent: assume your first version will miss lambdas. Test against a Spring Boot app early — it exercises all the nasty cases (CGLIB proxies, ByteBuddy-generated classes, reactive flatMap lambdas). Expose hooks as individually-toggleable flags so ops can disable a misbehaving instrumentation without uninstalling the whole agent.
