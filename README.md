# Scribere

Scribere is a small, opinionated blogging engine for people who want to publish plain HTML with a predictable folder structure. The scripts live at the repo root. Each blog instance owns its content, templates, assets, queries, and client‑side JavaScript under `content/`. This split lets you pull engine updates without overwriting your site design.

The engine ships with an `/example/` instance so you can run it immediately. When you are ready to start your own blog, you copy that example into `content/` using the setup script.

If `/content/` does not exist, the build uses `/example/` as the live instance. This lets the Scribere repo publish its own GitHub Pages site without running setup. As soon as you create `/content/`, the build switches to that instance automatically.

## Prerequisites

Install Node.js from the official site: https://nodejs.org/en

The dev server uses `nodemon` for file watching, and it is installed as a dev dependency when you run `npm install`.

## Create a new blog from scratch

This flow starts from an empty repository. It pulls the engine in from the Scribere upstream, then uses the setup script to create your instance.

1) Create a new empty repo on GitHub.
2) Initialise a local folder and pull the engine from upstream:

```sh
mkdir my-blog
cd my-blog
git init

git remote add upstream https://github.com/jhlagado/scribere.git
git pull upstream main
```

3) Add your own origin and push the code:

```sh
git remote add origin git@github.com:YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

4) Install dependencies and run the setup script:

```sh
npm install
npm run setup
```

The setup script copies `/example/` to `content/` and updates `content/site.json` with your details.
It also makes sure an `upstream` remote exists and fetches it so later updates work.
If you run setup again after you have content, it will skip the copy and leave your data untouched.

5) Start the local server:

```sh
npm start
```

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

Setup adds the upstream remote automatically, and `npm run update` will add it if it is missing. Conflicts are rare if your edits stay inside `content/`, but they can happen if you modify engine files. Treat those merges as you would any other Git change.

## Tooling notes

Script details live in [scripts/README.md](scripts/README.md).
