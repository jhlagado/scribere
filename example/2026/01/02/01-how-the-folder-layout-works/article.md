---
title: "How the Folder Layout Works"
status: published
summary: "Explains the dated folder layout and where templates, assets, and queries live in an instance."
tags:
  - structure
  - templates
---
# How the Folder Layout Works
By Example Author

Each article lives in a dated directory with a two-digit ordinal. The folder name becomes the public URL, so the path defines the page identity and keeps ordering clear across the archive.

Templates live beside your content under `content/`, and assets and queries sit in the same instance folder. The build reads only from that instance directory, which lets you pull engine updates without touching your site design. When you make your own blog, run the setup script to copy `/example/` into `/content/`, then replace the posts.
