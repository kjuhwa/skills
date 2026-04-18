---
name: jacoco-exclude-business-layers
version: 0.1.0-draft
tags: [decision, jacoco, exclude, business, layers]
title: Jacoco excludes service/repository/dto/config/kafka layers from coverage
category: decision
summary: In this project's Jacoco config, nearly every layer (service, repository, dto, entity, kafka, config, constants, helper, exception, schedule, provider) is excluded from coverage measurement — only controllers/business orchestration code is measured.
source:
  kind: project
  ref: lucida-cm@0c4edd30
  files:
    - build.gradle
confidence: high
---

## Fact

`build.gradle` `exclusionPatterns` excludes `**/service/**`, `**/repository/**`, `**/dto/**`, `**/entity/**`, `**/config/**`, `**/constants/**`, `**/kafka/**`, `**/avro/**`, `**/exception/**`, `**/helper/**`, `**/schedule/**`, `**/provider/**`, plus Querydsl Q-classes, from both Jacoco reports AND coverage verification AND Sonar.

## Why

Stated rationale is not recorded in commits, but the pattern matches a common policy: measure coverage only on hand-written "decision" code, not boilerplate (DTOs, configs) nor integration-adapter layers that are exercised by integration tests via TestContainers rather than unit tests. The exclusions mirror the SonarQube exclusions exactly, so the decision is consistent across quality gates.

## How to apply

- Don't optimize for raw coverage percentage by adding unit tests in excluded packages — they won't move the number.
- Validate service/repository behavior through integration tests (`@SpringBootTest` + TestContainers) instead.
- When introducing a new top-level package, decide up-front whether it belongs in `exclusionPatterns` and update `build.gradle` in the same commit to keep Jacoco and Sonar aligned.

## Counter / caveats

- This policy trades fine-grained unit-test pressure on service logic for reliance on integration tests. If integration tests slip, service logic can rot silently.
