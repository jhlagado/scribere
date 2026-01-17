# Scribere

Scribere is a small, opinionated blogging engine for people who want to publish plain HTML with a predictable folder structure. The scripts live at the repo root. Each blog instance owns its content, templates, assets, queries, and client‑side JavaScript under `content/`. This split lets you pull engine updates without overwriting your site design.

During active development, instances pull Scribere from GitHub. When the engine stabilises, the plan is to publish it on the npm registry.

The engine ships with an `/example/` instance so you can run it immediately. When you are ready to start your own blog, you copy that example into `content/` using the setup script.

If `/content/` does not exist, the build uses `/example/` as the live instance. This lets the Scribere repo publish its own GitHub Pages site without running setup. As soon as you create `/content/`, the build switches to that instance automatically.

## Prerequisites

Install Node.js from the official site: https://nodejs.org/en

On Windows, `winget` is usually available by default (it ships with the App Installer on Windows 10/11). If you do not have it, install App Installer from the Microsoft Store or use the Node installer directly.

Install git:

- macOS: `xcode-select --install` (or `brew install git`)
- Linux (Debian/Ubuntu): `sudo apt install git`
- Linux (Fedora): `sudo dnf install git`
- Windows: Git for Windows https://gitforwindows.org/

The dev server uses `nodemon` for file watching, and it is installed when you run `npm install`.

Windows note: if you see path length errors on Windows, enable long paths in system settings and restart your shell.

## Get started (gh CLI)

This is the shortest path to a working GitHub Pages site.

```sh
mkdir my-blog
cd my-blog
git init -b main
```

Create `package.json` and `.gitignore` as shown below, then:

```sh
npm install
npm run setup
gh repo create YOUR-USER/my-blog --public --source . --remote origin
git add .
git commit -m "Initial blog setup"
git push -u origin main
```

Enable Pages (one time):

```sh
gh api -X POST \
  -H "Accept: application/vnd.github+json" \
  /repos/YOUR-USER/my-blog/pages \
  -f "source[branch]=main" \
  -f "source[path]=/" \
  -f "build_type=workflow"
```

Then run the dev server locally:

```sh
npm start
```

Full walkthrough: [docs/setup-tutorial.md](docs/setup-tutorial.md).

## Local workflow

Keep the dev server running in one terminal (`npm start`) and write in another window. When the site looks correct and lint warnings are acceptable, publish with:

```sh
npm run publish
```

This runs lint and blocks only on high-severity issues, then stages all changes, commits with a default message, and pushes to your remote.

## Where your site lives

Your instance lives under `content/`. Posts are dated folders with a two‑digit ordinal. Templates and assets live beside your posts, and the build reads only from your instance directory.

## Publishing to GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds and publishes to GitHub Pages on every push to `main`. In your repo settings, set Pages to use **GitHub Actions** as the source.

Make sure the `SITE_URL` value in the workflow matches your public URL. That value also needs to match `siteUrl` in `content/site.json`, because it is used for the sitemap, RSS feed, and canonical links.

The build derives the base path from `siteUrl`. Project URLs such as `https://YOUR-USER.github.io/REPO/` are handled automatically. For a custom domain at the root, the base path is empty. Only set `BASE_PATH` if you need to override the automatic value.

## Custom domain

Once GitHub Pages is live, you can set a custom domain in the repository settings. Add a `CNAME` file to the published output containing your domain, and create the DNS records that GitHub Pages expects.

## Keeping up with engine updates

If you want upstream changes later, run:

```sh
npm run update
```

`npm run update` refreshes the Scribere dependency via `npm install` and updates your lockfile. It will refuse to run if your working tree has uncommitted changes.

## Tooling notes

Script details live in [scripts/README.md](scripts/README.md).
