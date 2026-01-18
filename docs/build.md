# Build and Pipeline Specification

This document defines Scribere’s build pipeline, the dev loop, and how CI publishes. It is **normative** for build behaviour.

---

## 1. Goals

The build must be predictable, debuggable, and safe. Markdown remains the source of truth and no derived artefact may override it.

The pipeline optimises for two different contexts:

- **Local development**: fast rebuilds, drafts visible, lint warnings shown.
- **CI publishing**: deterministic output, published content only.

---

## 2. High‑level stages

1. **Discovery**: walk the content tree and validate canonical paths.
2. **Indexing**: build the article table from frontmatter and filesystem data.
3. **Queries**: evaluate named queries to produce ordered result sets.
4. **Rendering**: stamp query results into templates.
5. **Outputs**: write HTML pages, feeds, sitemap, robots, and CNAME (if needed).

---

## 3. Local development

The dev loop uses incremental rebuilds. It runs with:

- `INCREMENTAL=1`
- `SOFT_FAIL=1`
- `LINT_REPORT_PATH=temp/lint-report.json`

Drafts and lint‑failing articles still render in dev, with a visible warning block above the article. The cache is stored at `temp/index.json` and is disposable.

If the cache is missing or invalid, the build falls back to a full scan and logs a warning.

---

## 4. CI publishing

CI builds from the commit tree and does not use the incremental cache. It publishes only articles with `status: published` unless the query explicitly asks otherwise.

CI runs the same build script but with defaults that favour determinism:

- no incremental cache
- no drafts
- no soft‑fail mode

---

## 5. Incremental rules

When a single article changes in dev, the build must re‑render:

- the article page itself
- any tag, series, year, month, or archive page that includes it
- feeds that include it

If frontmatter changes, rebuild both the old and new index targets. This is why the cache stores key metadata values.

---

## 6. Domain and base path

The build derives `BASE_PATH` from `siteUrl` in `content/site.json` unless explicitly overridden. This ensures:

- GitHub Pages sites use `/repo-name/`
- custom domains use `/`
- local dev forces `http://127.0.0.1:8000` with an empty base path

Custom domains should be written to `content/site.json` and will produce a `build/CNAME` file.

---

## 7. Outputs

The build generates:

- HTML pages for articles and indexes
- `feed.xml` and tag/series feeds
- `sitemap.xml`
- `robots.txt`
- `build/CNAME` when `customDomain` is set

Outputs are fully static. No runtime rendering is permitted.
