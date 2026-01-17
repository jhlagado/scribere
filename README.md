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

## Quick start (gh CLI)

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

## Create a new blog from scratch

This flow starts from an empty repository. Your blog repo depends on Scribere via `package.json`, and the setup script creates your instance in `content/`.

1) Create a new empty repo on GitHub.

2) Create a local folder and initialise Git:

```sh
mkdir my-blog
cd my-blog
git init
```

3) Add a `package.json` that installs Scribere and exposes the scripts:

```json
{
  "name": "my-blog",
  "private": true,
  "scripts": {
    "start": "node node_modules/scribere/scripts/start.js",
    "build": "node node_modules/scribere/scripts/build.js",
    "rebuild": "node node_modules/scribere/scripts/rebuild.js",
    "lint": "node node_modules/scribere/scripts/prose-lint.js",
    "publish": "node node_modules/scribere/scripts/publish.js",
    "update": "node node_modules/scribere/scripts/update.js",
    "setup": "node node_modules/scribere/scripts/setup.js"
  },
  "dependencies": {
    "scribere": "git+https://github.com/jhlagado/scribere.git"
  }
}
```

4) Install dependencies and run the setup script:

```sh
npm install
npm run setup
```

The setup script copies the bundled `/example/` instance into `content/` and updates `content/site.json` with your details.
If you run setup again after you have content, it will skip the copy and leave your data untouched.

5) Add your own origin and push the code (HTTPS):

```sh
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

6) Start the local server:

```sh
npm start
```

## Local workflow

Most people will keep a dev server terminal open and let it rebuild on change, while they author content through their editor or AI assistant. When the site looks correct and lint warnings are acceptable, publish with:

```sh
npm run publish
```

This runs lint and blocks only on high-severity issues, then stages all changes, commits with a default message, and pushes to your remote. It keeps git out of the day-to-day loop after initial setup.

For a full walkthrough of the two-window authoring loop, see [docs/workflow.md](docs/workflow.md).

## Where your site lives

Your instance lives under `content/`. Posts are dated folders with a two‑digit ordinal. Templates and assets live beside your posts, and the build reads only from your instance directory.

## Publishing to GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` builds and publishes to GitHub Pages on every push to `main`. In your repo settings, set Pages to use **GitHub Actions** as the source.

Make sure the `SITE_URL` value in the workflow matches your public URL. That value also needs to match `siteUrl` in `content/site.json`, because it is used for the sitemap, RSS feed, and canonical links.

## Custom domain

Once GitHub Pages is live, you can set a custom domain in the repository settings. Add a `CNAME` file to the published output containing your domain, and create the DNS records that GitHub Pages expects.

## Keeping up with engine updates

If you want upstream changes later, run:

```sh
npm run update
```

`npm run update` refreshes the Scribere dependency and updates your lockfile. It will refuse to run if your working tree has uncommitted changes.

## Tooling notes

Script details live in [scripts/README.md](scripts/README.md).
