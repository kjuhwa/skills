# One `exclusionPatterns` list for Jacoco + SonarQube

## Why

Coverage exclusions live in three places by default:

1. `jacocoTestReport.classDirectories` (what the HTML/XML report computes over).
2. `jacocoTestCoverageVerification.violationRules.excludes` (what the CI gate evaluates).
3. `sonar { properties { property 'sonar.exclusions'/'sonar.coverage.exclusions' } }`.

If they drift, either the gate passes but Sonar reports low coverage, or generated code (Avro, Querydsl Q-classes, DTOs) pollutes the numbers.

## Shape

In `build.gradle`:

```groovy
ext {
    exclusionPatterns = [
        "**/*Application*.*",
        "**/advice/**", "**/config/**", "**/constants/**",
        "**/avro/**", "**/kafka/**", "**/mqtt/**",
        "**/dto/**", "**/entity/**",
        "**/exception/**", "**/helper/**",
        "**/repository/**", "**/schedule/**", "**/service/**",
        "**/domain/**", "**/annotation/**", "**/event/**",
    ] + ('A'..'Z').collect { "**/**/Q${it}*" }   // Querydsl
    testExclusionPatterns = ["**/temp/**"]
}

tasks.named("jacocoTestReport") {
    classDirectories.setFrom(files(classDirectories.files.collect { dir ->
        fileTree(dir: dir, exclude: project.ext.exclusionPatterns)
    }))
}

tasks.named("jacocoTestCoverageVerification") {
    violationRules { rule { element = 'CLASS'; excludes = project.ext.exclusionPatterns } }
}

sonar {
    properties {
        property "sonar.exclusions",          project.ext.exclusionPatterns.join(",")
        property "sonar.coverage.exclusions", project.ext.exclusionPatterns.join(",")
        property "sonar.test.exclusions",     project.ext.testExclusionPatterns.join(",")
    }
}
```

## Notes

- Jacoco wants a **list** (`excludes = [...]`); Sonar wants a **comma-joined string** (`.join(",")`).
- Querydsl Q-classes are named `Q<Upper>...` — expand by letter rather than one global `**/Q*` to avoid false positives on domain classes starting with `Q`.
- Put `exclusionPatterns` inside `ext` so it is visible from all tasks and from `sonar { properties { ... } }`.
- Don't exclude `controller/**` globally — controller coverage is usually the most meaningful signal. Only exclude explicit `*Dev.*` variants.
