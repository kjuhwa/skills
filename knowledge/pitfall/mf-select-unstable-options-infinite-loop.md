---
version: 0.1.0-draft
tags: [pitfall, select, unstable, options, infinite, loop]
name: mf-select-unstable-options-infinite-loop
description: Custom Select/Dropdown components that accept an `options` array and diff it by reference can infinite-loop when consumed across a Module Federation boundary; prefer pure HTML selects or stabilize the array.
category: pitfall
confidence: medium
source:
  kind: project
  ref: lucida-ui@4b922a9043
---

# Fact

A design-system Dropdown (e.g. the in-house `Sirius Dropdown`) observed an infinite render loop when used inside a component exposed across MF. Root cause pattern:

1. Parent renders and passes a fresh array literal to `options`.
2. Dropdown's internal `useEffect` depends on `options` by reference and calls `setState` whenever the reference changes.
3. Across an MF boundary, even `useMemo` in the parent is insufficient if two React copies participate (singleton mismatch) or if the Dropdown triggers a parent re-render that invalidates memo keys.

The practical fix in this codebase was to replace the custom Dropdown with a plain HTML `<select>` or a minimal hand-rolled dropdown at the MF boundary.

# Why

Object-identity dependencies in `useEffect` + cross-MF React-singleton fragility make "looks stable" props actually unstable. Pure HTML or a controlled primitive-only API (value + string[] options) removes the failure mode entirely.

# How to apply

- When a component will be exposed through MF and currently relies on a design-system select/dropdown with `options: {label, value}[]` props, audit for `useEffect([options])` inside the DS component before using it.
- At MF boundaries prefer inputs whose props are all primitives, or stabilize options through `useMemo` + a deep-equal check if the DS component allows an `optionsKey` / `isOptionEqualToValue` hook.
- Verify the app shares a single React instance via MF `shared.react.singleton = true`; mismatches amplify this class of bug.

# Counter / Caveats

- Inside a single remote (no MF boundary) the design-system Dropdown works fine — don't rip it out globally.
- If the DS library later exposes a `optionsKey` prop or switches to a value-based comparison, this workaround may be unnecessary.
