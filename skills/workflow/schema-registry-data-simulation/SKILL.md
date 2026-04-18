---

name: schema-registry-data-simulation
description: Generating realistic synthetic schema evolution histories for registry demos and tests
category: workflow
triggers:
  - schema registry data simulation
tags: [workflow, schema, registry, data, simulation, test]
version: 1.0.0
---

# schema-registry-data-simulation

Realistic schema-registry simulation data needs three coordinated dimensions: a **subject catalog** (10-50 subjects named after plausible event domains like `user.signup.v1`, `order.completed`, `payment.settled.avro`), a **version history per subject** where version counts follow a long-tail distribution (most subjects have 2-5 versions, a few hot subjects have 30+), and a **compatibility-mode assignment** biased toward BACKWARD (~60%), with FORWARD, FULL, and NONE making up the remainder to reflect real Confluent/Apicurio deployments.

Generate each version as a delta over its predecessor rather than an independent schema. Use a weighted operation mix: 45% add-optional-field, 20% add-required-field-with-default, 15% rename-via-alias, 10% remove-deprecated-field, 5% type-widen (int→long, float→double), 5% type-narrow (the breaking case). This mix produces histories where most version bumps are safe under BACKWARD but occasional bumps trigger realistic compatibility failures — exactly the signal a demo needs. Tag each delta with the rule it would trigger so the UI can replay the registry's verdict deterministically.

Layer cross-subject references on top: pick 20-30% of subjects to reference a shared `common.Address` or `common.Money` subject, and propagate version bumps in the referenced subject into transitive-compatibility checks on the referencing subjects. This reproduces the most confusing real-world registry behavior — a subject "breaking" because of a change in a schema it imports — and gives the visualization meaningful cascade edges to animate.
