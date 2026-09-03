# Operations Guide

This guide is for day‑to‑day operation of a Scribere blog. It focuses on the commands you use most and how they behave.

---

## Local development

Run the dev server (builds, serves, and watches):

```sh
npm start
```

The dev server:

- rebuilds on file changes
- shows drafts
- reports structural warnings without stopping the preview

---

## Workflow

The intended workflow uses two windows:

- **Terminal** running `npm start` for continuous rebuilds and preview.
- **Editor/AI window** where you write or revise content and watch the results.

A third terminal is optional for one‑off commands. The goal is to keep daily work inside the dev server loop and only publish when the preview looks right.

---

## Create and edit articles

Create a new article:

```sh
npm run new
```

Edit title, status, tags, or series:

```sh
npm run edit
```

You can pipe a body into either command:

```sh
npm run new < draft.md
npm run edit < updated-body.md
```

Find articles from the command line:

```sh
npm run find -- "search term"
```

You can also filter by status or cap the result count:

```sh
npm run find -- "templating" --status draft --limit 10
```

## Unlisted drafts

An instance can deploy draft and review permalinks without adding those articles to its public indexes. Its `article-pages` query must omit the `status` filter, while `latest-posts` and `all-published-posts` must continue to require `status: published`. The resulting URL is suitable for informal review, but it is not private or access-controlled.

Publishing the article later requires one content change: set its frontmatter to `status: published`, rebuild, and run `npm run publish`. The journal, archives, tags, series, feeds, and sitemap then include it.

---

## Custom domain

Set or update a custom domain:

```sh
npm run domain
```

This updates `content/site.json` so URLs, feeds, and sitemaps use the correct domain.

---

## Build

Manual build:

```sh
npm run build
```

Force a full rebuild (clears the cache):

```sh
npm run rebuild
```

---

## Publish

```sh
npm run publish
```

This stages changes, commits, and pushes to `origin`. GitHub Actions then builds and publishes the site. Prose review belongs in the authoring step and never blocks the mechanical publishing step.

---

## Update the engine

```sh
npm run update
```

This pulls the latest Scribere engine, refreshes `package.json` scripts, and ensures `.gitignore` matches current defaults. It does **not** touch your content, templates, or assets.
