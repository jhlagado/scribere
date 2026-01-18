# Roadmap

This document tracks current and pending work in Scribere. It replaces older plan documents so the project has a single, current source of truth for what is next.

---

## Completed

- **Core/instance separation**: Scribere owns scripts; instances own content, templates, assets, CSS, client JS, and queries.
- **Instance fallback**: builds read from `/content/` when present, otherwise use `/example/` in the engine repo.
- **Domain workflow**: `npm run domain` updates `content/site.json` so URLs, feeds, and sitemap use the correct domain.

---

## Active priorities

1. **Incremental builds at scale**
   - Maintain an incremental index cache for dev.
   - Use file‑watching to limit rebuild scope while keeping Markdown as the source of truth.
   - Ensure the dev loop is robust on Windows.

2. **Script hardening**
   - Prefer warnings and soft‑fail behaviour when frontmatter is missing or malformed.
   - Avoid crashing on non‑critical data issues; surface them in logs and the dev UI.

3. **Script testing**
   - Add unit tests for build, lint, and setup/update scripts.
   - Establish a minimal test runner and coverage threshold.

---

## Near‑term improvements

- **Base‑URL handling** across local dev, GitHub Pages, and custom domains with no manual steps.
- **Lint visibility**: keep draft and lint warnings visible in dev without blocking previews.

---

## Packaging direction

- **Now**: GitHub repo dependency (`github:jhlagado/scribere`) for rapid iteration.
- **Later**: publish to npm with versioned releases once interfaces stabilise.
