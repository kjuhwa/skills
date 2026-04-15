# Gradle Jacoco Exclusion Strategy

Define a single `exclusionPatterns` list in `ext {}` and reuse it across Jacoco, Sonar, and coverage verification — so exclusions never drift between tools.

## Pattern

```groovy
ext {
    exclusionPatterns = [
        "**/*Application*.*",
        "**/advice/**", "**/config/**", "**/constants/**",
        "**/avro/**", "**/kafka/**", "**/mqtt/**",
        "**/dao/**", "**/dto/**", "**/entity/**",
        "**/exception/**", "**/executor/**", "**/helper/**", "**/util/**",
        "**/listener/**", "**/repository/**", "**/schedule/**", "**/service/**",
        "**/domain/**", "**/annotation/**", "**/dictionary/**", "**/event/**"
    ] + ('A'..'Z').collect { "**/**/Q${it}*" }  // Querydsl generated
}
```

## Apply to Jacoco report

```groovy
tasks.named("jacocoTestReport", JacocoReport) {
    classDirectories.setFrom(files(classDirectories.files.collect { dir ->
        fileTree(dir: dir, exclude: project.ext.exclusionPatterns)
    }))
    finalizedBy tasks.named("jacocoTestCoverageVerification")
}

tasks.named("jacocoTestCoverageVerification", JacocoCoverageVerification) {
    violationRules { rule { element = 'CLASS'; excludes = project.ext.exclusionPatterns } }
}
```

## Apply to Sonar

```groovy
sonar { properties {
    property "sonar.exclusions",          project.ext.exclusionPatterns.join(",")
    property "sonar.coverage.exclusions", project.ext.exclusionPatterns.join(",")
} }
```

## Why

- DTOs/entities/config are structural — coverage is noise.
- Generated Avro/Querydsl classes cannot be tested meaningfully.
- Single source of truth prevents Jacoco/Sonar divergence.

## Adjust

- Keep `**/service/**` EXCLUDED only if services are thin orchestration. Remove if they hold business logic worth covering.
- Don't exclude `**/controller/**` unless you have a convention like `*Dev.java` for local-only endpoints.
