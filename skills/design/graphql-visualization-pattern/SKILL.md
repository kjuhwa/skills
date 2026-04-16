---
name: graphql-visualization-pattern
description: Canvas-based rendering pattern for GraphQL schema graphs, query ASTs, and subscription event streams
category: design
triggers:
  - graphql visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# graphql-visualization-pattern

GraphQL data structures are inherently graph-shaped (schemas with type relationships, queries as nested selection trees, subscriptions as temporal event streams), so visualization apps benefit from a three-layer rendering pattern: (1) a parser layer that converts GraphQL SDL/query strings into a normalized node-edge model using `graphql-js` `parse()` and `buildSchema()`, (2) a layout layer that applies force-directed positioning for schema graphs or hierarchical tree layout for query ASTs, and (3) an SVG or Canvas draw layer with pan/zoom via viewBox manipulation. For the schema visualizer, each `ObjectTypeDefinition` becomes a node card listing fields; edges connect when a field's type references another object type (including through `NonNullType` and `ListType` wrappers that must be unwrapped recursively).

For the query playground, render the selection set as a collapsible tree where each `Field` node shows its arguments, directives (`@include`, `@skip`), and nested selections — this makes fragment spreads and inline fragments visually distinct by using dashed borders or color coding. For the subscription monitor, use a time-axis scrolling lane per active subscription where each incoming `data` payload becomes a pill positioned by arrival timestamp, with payload size encoded as pill width and error events rendered in a separate error lane below.

The shared primitive across all three is a `GraphQLNode` component that accepts `{ kind, name, meta, children }` and delegates rendering based on `kind` (`OBJECT_TYPE`, `FIELD`, `EVENT`, `FRAGMENT`). This lets the three apps share ~60% of rendering code while specializing the parser and layout layers per domain.
