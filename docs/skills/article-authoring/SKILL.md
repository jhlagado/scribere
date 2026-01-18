---
name: article-authoring
description: Write, edit, and structure Semantic Scroll articles in `content/**/article.md`. Use when asked to create a new article, revise prose, adjust frontmatter (title/summary/tags/series/status), add assets and captions, or fix lint issues while following `docs/authoring.md` and article specs.
---

# Article Authoring

## Overview

This skill guides article creation and revision so the writing matches the project’s authoring rules, structure, and UK/AU spelling expectations. It treats articles as the primary source of visible content and keeps metadata strict and minimal.

## Workflow

Start by reading the relevant specs: `docs/authoring.md`, `docs/article-spec.md`, and `docs/articles-frontmatter.md`. If the request affects templates or indexing, check `docs/templating.md` and `docs/queries.md` as well.
Before making any changes, read `AGENTS.md` and follow it. It is the mandatory entry point for work in this repository.

When creating a new article, use `npm run new` to generate the `content/YYYY/MM/DD/NN-slug/` folder and the initial `article.md`. Use the body title as the source of truth for the folder name and frontmatter title, and keep the summary aligned with the intent in `docs/intent.md` when it exists.

When revising prose, keep paragraphs substantive, avoid contrast framing and rhetorical filler, and use UK/AU spelling. Preserve the author’s voice and focus on clarity, specificity, and readable structure, without introducing new jargon or template logic.

If linting is requested, run `npm run lint -- --all` (or use the repository’s lint command as given). Address warnings directly in the text. When lint is not requested, still avoid the patterns flagged in `docs/authoring.md` and ensure summaries remain accurate and useful in index views.

When adding assets, keep them local to the article folder and use clear captions and alt text. Ensure all visible text remains in the Markdown body and keep metadata separate from narrative content.

## Output checks

Confirm frontmatter is complete and valid, the body title matches the folder name, and the visible article content is only in Markdown. Verify links use the published `/content/...` paths and do not point to filesystem locations.
