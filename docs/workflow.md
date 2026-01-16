# Workflow

This system is designed for a two‑window workflow. One terminal runs the dev server in a loop. The other window is where you give instructions to your editor or AI assistant and monitor the result. A third terminal is optional if you want to run one‑off commands, but most people will not need it once setup is done.

## Local development loop

Start the dev server once and leave it running:

```sh
npm start
```

The dev server watches for changes, rebuilds incrementally, and keeps serving the latest output. Drafts are included in dev so you can see in‑progress work without publishing.

## Authoring flow

The authoring loop is simple:

1. Create or edit an article file under `content/`.
2. Let the dev server rebuild and check the result in your browser.
3. If there are lint warnings, fix them until you are happy or accept them and move on.
4. When the AI tells you the article is ready, publish in a separate terminal if needed.

The dev loop does not stop the server when lint warnings appear. It keeps the preview live so the work stays visible.

## Publishing

When a draft looks right and you want to ship it, run:

```sh
npm run publish
```

That command runs lint and blocks only on high‑severity issues. If it passes, it stages changes, creates a commit, and pushes to your remote. GitHub Actions then builds and publishes the site.

## Why this works

The files stay the source of truth. The dev server is a preview of that source, and the publish step is a controlled hand‑off to CI. You get a predictable loop without having to manage git commands in day‑to‑day work.
