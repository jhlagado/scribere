# Article Unit Specification

This document defines the **Article Unit**: the single, durable unit of content that Scribere publishes. Articles are files on disk, not rows in a database, and the filesystem path is the canonical identity.

The rules here are **normative**. If an article does not conform, the build should fail (or warn in dev mode) rather than guess.

---

## 1. Filesystem identity

An article lives at:

```
content/YYYY/MM/DD/NN-slug/article.md
```

Scribere uses `/content/` as the live instance root. If `/content/` is missing, the engine falls back to `/example/` for the bundled reference site.

The two‑digit `NN` ordinal is mandatory. It keeps same‑day posts ordered correctly and makes the URL stable. Once an article is created, its folder is permanent even if the prose is revised years later.

A **slug** is the short, URL‑safe phrase after the ordinal. Keep slugs under 80 characters to avoid path‑length issues on some systems. Asset file names should stay under the same limit.

Each article directory contains:

- one canonical Markdown file named `article.md`
- an optional `assets/` folder for images, diagrams, PDFs, or data files

No other files should sit beside `article.md`.

---

## 2. Frontmatter (metadata)

Frontmatter exists to power indexing, summaries, and fixed metadata blocks around the body. It does **not** render full article prose.

Required field:

```yaml
status: published
```

Allowed values: `draft`, `review`, `published`, `archived`.

Optional fields:

```yaml
title: "Short title used in index views"
summary: "Short factual summary used in index views. Keep it plain and direct."
tags:
  - tooling
  - publishing
series: templating
thumbnail: assets/thumbnail.jpg
```

Rules:

- `title` and `summary` may differ from the Markdown body title.
- `summary` should be at least two sentences and use plain language.
- `thumbnail` must point to a file inside the article’s `assets/` folder.
- `tags` are a flat list; order does not matter.
- `series` is a single value.

Dates are derived from the filesystem path, not frontmatter. Any `date` fields are ignored.

---

## 3. Tags and series

Tags are topical groupings. Tag pages sort newest‑first so the most recent material surfaces quickly.

Series are narrative groupings. Series pages sort oldest‑first so the story reads in order.

An article can have many tags and at most one series.

---

## 4. Body rules

The body is the visible document. If something should appear on the page, it must be authored in the Markdown body.

A typical article begins with a title and byline:

```markdown
# Title of the Article

By John Hardy
```

Dates, tags, and series are rendered by fixed metadata blocks around the body. You may repeat them in the prose if you want, but the default expectation is that they live outside the body.

### Captioned code listings

If a fenced code block is followed immediately by a line that begins with `@@Caption:`, Scribere wraps the block in a `<figure class="listing">` and renders the caption as `<figcaption>`.

````markdown
```html
<ul>
  <li>First post</li>
  <li>Second post</li>
</ul>
```
@@Caption: Short posts I want to surface on the home page.
````

### Fold marker

A line containing `@@Fold` splits the article. Everything after the marker is wrapped in a `<details class="article-fold">` element. You can customise the summary text with `@@Fold: Continue reading`.

---

## 5. Validation expectations

Build should fail when:

- frontmatter is missing
- `status` is missing or invalid
- required files are missing or ambiguous

Build should warn in dev when:

- a slug or asset name exceeds 80 characters
- an article lacks tags

---

## Glossary (plain language)

- **Slug**: the short, URL‑safe phrase in the folder name after the ordinal.
- **Frontmatter**: the metadata block at the top of a Markdown file.
- **Metadata**: descriptive information used for indexing and summaries.
- **Template**: the HTML layout that receives stamped content.
- **Build**: the process that renders Markdown into HTML.
- **Lint**: an automated check for writing and formatting issues.
