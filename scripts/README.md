# Local Scripts

These scripts are intended for local use and are not part of CI. They are implemented in Node so the same commands work on macOS, Linux, and Windows. Node.js is required, and tools like `nodemon` are installed with `npm install`.

Node.js is required to run the scripts in this folder. Install it globally using your preferred method. Two common options are:

With nvm (macOS/Linux):

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install --lts
nvm use --lts
```

With Homebrew (macOS):

```sh
brew install node
```

With winget (Windows):

```powershell
winget install OpenJS.NodeJS.LTS
```

Or download the Windows installer from https://nodejs.org/en and use the LTS release.

## Build the site

```sh
npm run build
```

The build script validates the content structure and writes the static site output.

If you want to force a full rebuild and discard the incremental cache:

```sh
npm run rebuild
```

## Build on change and serve

```sh
npm start
```

This builds the site, starts the local server, and rebuilds on changes in `content/`, `example/`, and `config/`. By default the dev server binds to `127.0.0.1`; set `HOST=0.0.0.0` if you need to reach it from another device, and override the port with `PORT=xxxx` if needed.

The dev loop includes draft and review articles in its preview. Their article pages carry a visible status notice.
If the requested port is already in use, the local server now tries the next available port and prints the selected URL.

Local development runs in incremental mode. The build caches frontmatter and derived metadata in `temp/index.json` so large archives do not require a full re-parse on every change. If you want to force a full scan, delete `temp/index.json` and rebuild.

## Publish changes

```sh
npm run publish
```

This stages all changes, commits with a default message, and pushes to your remote. It expects git to be installed and your user name/email to be configured. Prose review is part of writing and editing, not this mechanical publishing command.

If `origin` is missing or git user details are unset, the publish step stops and prints the exact commands to fix it.

When the dev build emits structural warnings, it writes them to `temp/build-report.json` without stopping the preview server.

## Lint code

```sh
npm run lint:code
```

This runs ESLint over the engine scripts and flags unused or undefined symbols.
