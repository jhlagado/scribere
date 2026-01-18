---
name: scribere-ops
description: Manage Scribere and Semantic Scroll operations. Use when asked to set up a new instance, run the dev server or build, pull upstream updates, resolve build or lint issues, or adjust instance layout (content, templates, assets, queries, client JS) while keeping engine files intact.
---

# Scribere Ops

## Overview

This skill covers day‑to‑day operations for Scribere and the Semantic Scroll instance, with a focus on safe updates, predictable builds, and instance ownership of templates, assets, and content. It avoids destructive Git actions and keeps changes aligned with the repository specs.

## Workflow

Confirm which repo is in scope (`scribere` engine or `semantic-scroll` instance), then read `AGENTS.md` and the relevant specs (`docs/PRD.md`, `docs/templating.md`, `docs/queries.md`, `docs/ci-pipeline.md`) before proposing changes.
Treat `AGENTS.md` as mandatory. It is the entry point for any work in this repo and must be followed throughout.

For first‑time setup, use `npx --yes github:jhlagado/scribere#main` in a fresh folder. This creates the repo, installs Scribere, and copies `/example/` into `/content/`. Do not re‑copy content if `/content/` already exists.

For updates, run `npm run update`. This adds `upstream` if missing, fetches it, and merges `upstream/main`. If the merge fails due to unrelated histories, stop and ask before applying a one‑time `--allow-unrelated-histories` merge.

For local work, use `npm start` to build, serve, and watch. This writes the lint report to `temp/lint-report.json` without blocking the dev server. Use `npm run build` for a clean one‑shot build, and `npm run lint -- --all` when a full lint sweep is needed.

If a site switches to a custom domain, update `content/site.json` with:

```
npm run domain
```

Instance ownership is strict: templates, assets, client JS, content, and instance queries live under `/content/` in the instance repo. Engine scripts stay at the repo root. Avoid moving templates into the engine unless explicitly requested.

## Output checks

Ensure builds read from `/content/` (falling back to `/example/` only in the engine repo), and that no instance files are overwritten by updates. Verify that template changes remain pure HTML and that queries remain JSON‑only.
