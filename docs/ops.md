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
- keeps the preview running even when lint warnings exist

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

---

## Custom domain

Set or update a custom domain:

```sh
npm run domain
```

This updates `content/site.json` so URLs, feeds, and sitemaps use the correct domain.

---

## Lint and build

Manual lint:

```sh
npm run lint
```

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

This runs lint (blocking only on high‑severity issues), stages changes, commits, and pushes to `origin`. GitHub Actions then builds and publishes the site.

---

## Update the engine

```sh
npm run update
```

This pulls the latest Scribere engine, refreshes `package.json` scripts, and ensures `.gitignore` matches current defaults. It does **not** touch your content, templates, or assets.
