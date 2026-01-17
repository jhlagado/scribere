# Scribere Setup Tutorial

This guide walks you from zero to a working blog using Scribere. It uses the GitHub website (no CLI) and the Scribere setup script. The example repo name is `my-blog`, and we will serve it from GitHub Pages with no custom domain.

## Prerequisites

Install these before you start:

- Git: https://git-scm.com/downloads
- Node.js: https://nodejs.org/en

You also need a GitHub account.

## 1. Create the GitHub repo (website)

1. Go to https://github.com/new
2. Repository name: `my-blog`
3. Public
4. Do not add a README or .gitignore
5. Click Create repository

Copy the HTTPS URL shown on the repo page. It looks like:

```
https://github.com/YOUR-USER/my-blog.git
```

## 2. Run the Scribere setup (npx)

From the parent folder where you want the blog created:

```sh
npx --yes github:jhlagado/scribere
```

The script asks a few questions and then creates the blog folder, installs Scribere, and copies the example site into `content/`.

If you already created the GitHub repo, paste its HTTPS URL when prompted. The script can add `origin`, commit, and push for you.

Example answers:

- Site name: `My Blog`
- Description: `A personal blog built with Scribere.`
- Site URL: `https://YOUR-USER.github.io/my-blog`
- Custom domain: *(leave blank)*
- Author: `John Hardy`
- Language: `en-AU`

After setup, your site lives in `content/`:

- `content/site.json` holds site metadata
- `content/templates/` holds HTML templates
- `content/assets/` holds CSS and images
- `content/YYYY/MM/DD/NN-slug/` holds posts

## 3. Connect the remote and push

Move into the new blog folder, then attach the remote and push:

```sh
cd my-blog
git remote add origin https://github.com/YOUR-USER/my-blog.git
git add .
git commit -m "Initial blog setup"
git push -u origin main
```

## 4. Enable GitHub Pages (website)

1. Open your repo on GitHub
2. Go to Settings → Pages
3. Under Source, choose GitHub Actions
4. Save

Your site will be available at:

```
https://YOUR-USER.github.io/my-blog/
```

### Base path (automatic)

Scribere derives the base path from `siteUrl`. If your site URL is a GitHub Pages project URL such as `https://YOUR-USER.github.io/REPO/`, the build will automatically prefix asset and content URLs with `/REPO`. For a custom domain at the root (for example `https://example.com/`), the base path is empty.

Only set `BASE_PATH` if you need to override that automatic behaviour.

## 5. Run locally

```sh
npm start
```

This runs the dev server, rebuilds on changes, and shows draft/lint issues during local development.

## 6. Publishing updates

When you edit or add posts:

```sh
git add .
git commit -m "Update content"
git push
```

GitHub Actions will rebuild and publish automatically.

---

## Notes for non-technical users

- Keep one terminal open running `npm start`.
- Use your AI tool to edit files and check the local preview.
- When the AI says the build is clean, commit and push.

If you get stuck, check the Actions tab in GitHub to see build errors.
