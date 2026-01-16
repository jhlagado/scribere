# Incremental Publishing System

## 1. Purpose

This document is the upstream source of truth for Scribere’s incremental build behaviour. It defines how the dev server stays responsive with large archives while CI remains deterministic and publish‑only. Any script changes that affect incremental behaviour should be reflected here first, so downstream sites can pull updates with confidence.

The system keeps the filesystem as the source of truth. Nothing in the build pipeline is allowed to supersede the Markdown articles or their frontmatter. The cache exists only to avoid re‑parsing the whole archive on every keystroke.

## 2. Core model

Local development and CI have different goals, so they use different strategies. Local development optimises for immediacy and visibility, including drafts and lint warnings. CI optimises for repeatability, publishing only what is committed and marked `published`. The build script supports both by using a disposable cache for local runs and a full scan for CI.

This model deliberately avoids a change journal. The earlier idea of journalling changes conflicts with the rule that Markdown is the source of truth and creates a second authoritative layer. The system instead uses file change events and a cache that can be deleted at any time.

## 3. Local development flow

Local development uses nodemon to trigger rebuilds and the build script to decide what to re‑parse. The dev loop runs with `INCREMENTAL=1` and `SOFT_FAIL=1`, which keeps the preview usable while showing draft and lint issues above the affected articles. The cache lives at `temp/index.json` and stores per‑article signatures and derived metadata.

On each change, the build:

1. Compares article signatures against the cache.
2. Re‑parses only the changed articles.
3. Rebuilds those article pages and the index pages they affect.
4. Rewrites the cache for the next run.

If the cache is missing or invalid, the build falls back to a full scan and records a warning. The cache never replaces source content and can be safely deleted at any time.

## 4. CI flow

CI builds from the commit tree. It does not use the incremental cache and does not include drafts or lint‑failing articles unless explicitly requested. It can rebuild everything on each run because CI is a batch job and prioritises determinism over speed.

If incremental CI is ever needed, it should use git diffs between commits to calculate the affected articles and rerun the same incremental rules as the dev server. That mode remains optional; full builds remain the default.

## 5. Incremental rebuild rules

Incremental rebuilds must be conservative and correct. For each changed article, the build re‑renders:

- the article page itself
- any tag, series, year, month, or archive page that would include it
- feeds and tag/series feed pages that include it

If metadata changes, index membership can shift, so both the old and new index targets must be rebuilt. This is why the cache stores frontmatter values alongside the signature.

## 6. Cache design

The cache is a JSON file with a version stamp, input signatures, and per‑article entries. Each entry stores the article’s mtime and size signature plus the derived frontmatter fields needed to compute index membership. It does not store the article body and it does not store rendered HTML.

The cache is disposable. If it is missing, corrupted, or out of date, the build performs a full scan and regenerates it. This keeps the system safe when templates or queries change.

## 7. Failure and recovery

The build should degrade safely when data is missing or malformed. Missing frontmatter fields should be defaulted to draft during local development, and hard errors should be reserved for CI. When the build cannot determine a safe incremental update, it should fall back to a full scan rather than produce an incomplete output.

## 8. Implementation plan

Stage 1 is already in place. Local dev uses `INCREMENTAL=1`, writes `temp/index.json`, and rebuilds only what changes. `npm run rebuild` clears the cache and forces a full scan.

Stage 2 can add explicit file‑path awareness. A small watcher wrapper can pass changed paths into the build for even less scanning. This is optional and should keep behaviour identical.

Stage 3, if needed, adds optional git‑diff incremental builds for CI. This should remain an opt‑in mode so the default remains a full build.
