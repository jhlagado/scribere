# Scribere Setup Tutorial

This guide walks you from zero to a working blog using Scribere. It uses the GitHub CLI so the steps are repeatable and low‑friction. The example repo name is `my-blog`, and we’ll serve it from GitHub Pages with no custom domain.

## Prerequisites

Install these before you start:

- Git: https://git-scm.com/downloads
- Node.js: https://nodejs.org/en
- GitHub CLI (`gh`): https://cli.github.com/

Then sign in to GitHub CLI:

```sh
gh auth login
```

## 1. Create a new local project

Pick a folder for your new blog and initialise it:

```sh
mkdir my-blog
cd my-blog
git init -b main
```

## 2. Add Scribere as a dependency

Create `package.json` and point it at the Scribere repo:

```json
{
  "name": "my-blog",
  "private": true,
  "scripts": {
    "start": "node node_modules/scribere/scripts/start.js",
    "build": "node node_modules/scribere/scripts/build.js",
    "rebuild": "node node_modules/scribere/scripts/rebuild.js",
    "lint": "node node_modules/scribere/scripts/prose-lint.js",
    "update": "node node_modules/scribere/scripts/update.js",
    "publish": "node node_modules/scribere/scripts/publish.js",
    "setup": "node node_modules/scribere/scripts/setup.js"
  },
  "dependencies": {
    "scribere": "git+https://github.com/jhlagado/scribere.git"
  }
}
```

Add a `.gitignore` so build output and dependencies don’t get committed:

```gitignore
/node_modules/
/build/
/temp/
.DS_Store
```

Install dependencies:

```sh
npm install
```

## 3. Initialise your site content

Run the setup script to create the `content/` folder and site metadata:

```sh
npm run setup
```

Use values that match your blog. Example inputs:

- Site name: `My Blog`
- Description: `A personal blog built with Scribere.`
- Site URL: `https://jhlagado.github.io/my-blog`
- Custom domain: *(leave blank)*
- Author: `John Hardy`
- Language: `en-AU`

After setup, your site lives in `content/`:

- `content/site.json` holds site metadata
- `content/templates/` holds HTML templates
- `content/assets/` holds CSS and images
- `content/YYYY/MM/DD/NN-slug/` holds posts

## 4. Create the GitHub repo (via gh)

From the project folder, create the GitHub repo and wire it up:

```sh
gh repo create jhlagado/my-blog --public --source . --remote origin
```

## 5. Commit and push

```sh
git add .
git commit -m "Initial blog setup"
git push -u origin main
```

## 6. Enable GitHub Pages (via gh)

This enables Pages from the `main` branch using GitHub Actions:

```sh
gh api -X POST \
  -H "Accept: application/vnd.github+json" \
  /repos/jhlagado/my-blog/pages \
  -f "source[branch]=main" \
  -f "source[path]=/" \
  -f "build_type=workflow"
```

Your site will be available at:

```
https://jhlagado.github.io/my-blog/
```

### Base path note (GitHub Pages project sites)

If your site lives at `https://YOUR-USER.github.io/REPO/`, you must set `BASE_PATH=/REPO` in your Pages workflow so asset and content links resolve correctly. For a custom domain at the root (for example `https://example.com/`), leave `BASE_PATH` empty.

In `.github/workflows/deploy-pages.yml`, add:

```yaml
      - name: Build
        run: npm run build
        env:
          SITE_URL: https://YOUR-USER.github.io/REPO
          BASE_PATH: /REPO
```

## 7. Run locally

```sh
npm start
```

This runs the dev server, rebuilds on changes, and shows draft/lint issues during local development.

## 8. Publishing updates

When you edit or add posts:

```sh
git add .
git commit -m "Update content"
git push
```

GitHub Actions will rebuild and publish automatically.

---

## Notes for non‑technical users

- Keep one terminal open running `npm start`.
- Use your AI tool to edit files and check the local preview.
- When the AI says the build is clean, commit and push.

If you get stuck, check the Actions tab in GitHub to see build errors.
