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

The build script writes the site output only. Prose linting is a separate step you run when you want it.

If you want to force a full rebuild and discard the incremental cache:

```sh
npm run rebuild
```

## Build on change and serve

```sh
npm start
```

This runs the lint report, builds the site, starts the local server, and rebuilds on changes in `content/`, `example/`, and `config/`. By default the dev server binds to `127.0.0.1`; set `HOST=0.0.0.0` if you need to reach it from another device, and override the port with `PORT=xxxx` if needed.

The dev loop prints a short status line when lint and build succeed. Lint issues are reported without stopping the server.

Local development runs in incremental mode. The build caches frontmatter and derived metadata in `temp/index.json` so large archives do not require a full re-parse on every change. If you want to force a full scan, delete `temp/index.json` and rebuild.

## Publish changes

```sh
npm run publish
```

This runs lint and blocks only on high-severity issues, then stages all changes, commits with a default message, and pushes to your remote. It expects git to be installed and your user name/email to be configured.

If `origin` is missing or git user details are unset, the publish step stops and prints the exact commands to fix it.

## Lint prose in drafts

The prose linter scans `content/**/article.md` when `/content/` exists. If not, it falls back to `example/**/article.md`.
It only prints output when it finds issues.

Rules, thresholds, and metrics live in `config/prose-lint.json`. You can disable a rule by setting `"enabled": false`. CLI flags still override config values.

```sh
npm run lint
```

To include published posts:

```sh
npm run lint -- --all
```

To enforce thresholds (useful for CI):

```sh
npm run lint -- --all --gate
```

Defaults are per file: high>=1, medium>=3, low>=6. You can override them:

```sh
npm run lint -- --all --gate --max-high=1 --max-medium=2 --max-low=5
```

If you want fail-fast instead of thresholds:

```sh
npm run lint -- --all --strict
```

When the dev build emits warnings or lint issues, it also writes `temp/build-report.json` with the combined warnings and lint report. This gives the preview UI one place to read diagnostics without stopping the server.

## Lint code

```sh
npm run lint:code
```

This runs ESLint over the engine scripts and flags unused or undefined symbols.
