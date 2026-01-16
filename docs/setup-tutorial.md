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

## 2. Create your local repo

Create a local folder and initialise Git.

```sh
mkdir my-blog
cd my-blog
git init
```

Add a basic `.gitignore` so build output and dependencies do not end up in Git.

```sh
cat <<'EOF' > .gitignore
/build/
/node_modules/
/temp/
EOF
```

## 3. Add Scribere to your package.json

Create a `package.json` that installs Scribere and exposes the scripts:

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

## 4. Install dependencies and run setup

Install Node dependencies and run the setup script. The script copies `/example/` into `/content/`, then updates your `content/site.json` values.

```sh
npm install
npm run setup
```

If `/content/` already exists, the script will stop to avoid overwriting your work.
If you run setup in a non-interactive shell, it uses the defaults from the example instance. You can update `content/site.json` by hand at any time, or delete `content/` and run setup again.

## 5. Point the repo at your origin

Add your own repository as the origin and push.

```sh
git remote add origin git@github.com:YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

## 6. Run the local server

```sh
npm start
```

This builds the site and starts a watcher that rebuilds when you edit content, templates, or assets.

## 7. Publish to GitHub Pages

The repository ships with a GitHub Actions workflow that builds and publishes to Pages on every push to `main`. In **Settings → Pages**, set the source to **GitHub Actions**. Then update the `SITE_URL` value inside `.github/workflows/deploy-pages.yml` so it matches your public URL.

That same URL should be used in `content/site.json`. It feeds the sitemap, RSS, and canonical links.

## 8. Add a custom domain (optional)

When Pages is live, you can set a custom domain in your repository settings. Add a `CNAME` file to the published output containing your domain, then create the DNS records that GitHub Pages expects.

## 9. Pulling engine updates later

If you want future engine updates, run:

```sh
npm run update
```

`npm run update` refreshes the Scribere dependency and updates your lockfile. It will refuse to run if your working tree has uncommitted changes.
