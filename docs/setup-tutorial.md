# Set up your own Scribere blog

This tutorial starts from an empty repository and ends with a live blog on GitHub Pages. It assumes you want engine updates without inheriting someone else’s content. The key idea is simple: the engine lives in the root, while your site lives under `content/`.

## Before you start

You need Node.js and git.

- Node.js: https://nodejs.org/en (use the LTS release)
- Git:
  - macOS: `xcode-select --install` (or `brew install git`)
  - Linux (Debian/Ubuntu): `sudo apt install git`
  - Linux (Fedora): `sudo dnf install git`
  - Windows: https://gitforwindows.org/

## 1. Create an empty repo

Create a new repository on GitHub. Leave it empty. You will pull the Scribere engine into it next.

## 2. Pull the engine into your empty repo

Create a local folder, initialise Git, and pull from the Scribere upstream.

```sh
mkdir my-blog
cd my-blog
git init

git remote add upstream https://github.com/jhlagado/scribere.git
git pull upstream main
```

At this point you have the engine code plus the example instance in `/example/`.

## 3. Point the repo at your origin

Add your own repository as the origin and push.

```sh
git remote add origin git@github.com:YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

## 4. Install dependencies and run setup

Install Node dependencies and run the setup script. The script copies `/example/` into `/content/`, then updates your `content/site.json` values.

```sh
npm install
npm run setup
```

If `/content/` already exists, the script will stop to avoid overwriting your work.

## 5. Run the local server

```sh
npm start
```

This builds the site and starts a watcher that rebuilds when you edit content, templates, or assets.

## 6. Publish to GitHub Pages

The repository ships with a GitHub Actions workflow that builds and publishes to Pages on every push to `main`. In **Settings → Pages**, set the source to **GitHub Actions**. Then update the `SITE_URL` value inside `.github/workflows/deploy-pages.yml` so it matches your public URL.

That same URL should be used in `content/site.json`. It feeds the sitemap, RSS, and canonical links.

## 7. Add a custom domain (optional)

When Pages is live, you can set a custom domain in your repository settings. Add a `CNAME` file to the published output containing your domain, then create the DNS records that GitHub Pages expects.

## 8. Pulling engine updates later

If you want future engine updates, run:

```sh
npm run update
```

Your content stays safe because it lives under `content/`. Conflicts can still happen if you edit engine files, so treat merges carefully.
