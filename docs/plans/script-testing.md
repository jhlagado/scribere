# Script Testing Plan

## Goal

Add repeatable unit tests for Scribere’s Node scripts without introducing heavy tooling. Tests should run on macOS, Linux, and Windows.

## Proposed approach (minimal dependencies)

Use Node’s built‑in test runner (`node:test`) and `assert`. This avoids Jest, keeps startup fast, and keeps the toolchain small.

## Why not Jest

Jest is capable but adds a large dependency and a configuration surface that does not match Scribere’s minimal‑toolchain goals. For this project, the built‑in runner is sufficient.

## What to test first

Start with the pure logic that is easiest to isolate:

- config loading and defaults
- instance root resolution (`/content` vs `/example`)
- slug and asset validation
- lint report parsing and build warning formatting
- query parsing and validation

## Structure

```
scripts/
  lib/
    config.js
    instance.js
    lint.js
    paths.js
  __tests__/
    config.test.js
    instance.test.js
    lint.test.js
```

Move pure helpers into `scripts/lib/` so they can be imported by both the build script and the tests. Keep command‑line glue in the existing script files.

## npm scripts

Add:

```
test: "node --test"
test:coverage: "node --test --coverage"
```

Coverage is built‑in in modern Node versions and requires no extra packages.

## Fixtures

Keep small fixture trees under `scripts/__tests__/fixtures/` to test:

- missing frontmatter
- malformed status values
- long slugs
- missing templates
- draft vs published visibility

## Rollout

1. Extract one helper (e.g. config loader) into `scripts/lib/`.
2. Add one test file and run it in CI.
3. Repeat for the next helper.

This keeps risk low while building confidence.
