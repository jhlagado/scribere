# Scribere

Scribere is a small blogging engine that turns plain Markdown folders into a static site. You create a repo for your blog, run one command, and Scribere builds the site from the `content/` folder it creates for you.

## Set up a blog

### Choose a name

Let’s call the GitHub account `my-user-id` and the repo `my-big-blog`.

### Create the repo on GitHub

Go to https://github.com/new, enter `my-big-blog`, keep it public, and do not add a README or .gitignore. When the repo is created, GitHub shows a “Quick setup” box with the HTTPS URL. It looks like this:

```
https://github.com/my-user-id/my-big-blog.git
```

### Run the Scribere setup

Now open a terminal. From the parent folder where you want the blog created, run:

```sh
npx --yes github:jhlagado/scribere#main
```

Answer the questions. Press Enter to accept the defaults. It will look like this:

```
Git remote HTTPS URL: https://github.com/my-user-id/my-big-blog.git
Project folder [my-big-blog]:
Site name [My Big Blog]:
Site description [A personal blog built with Scribere.]:
Site URL [https://my-user-id.github.io/my-big-blog]:
Custom domain (optional):
Author name [my-user-id]:
Language tag [en-AU]:
```

### Run the local dev server

When the setup finishes, change into the folder and run the local dev server:

```sh
cd my-big-blog
npm start
```

That runs the local preview and rebuilds when files change.

### Keep the engine up to date

`npm run update` pulls the latest Scribere engine and makes sure your `package.json` scripts and `.gitignore` match the current defaults. It does not touch your content, templates, or assets.

## Write and edit articles

### Create a new article

From the blog folder, run:

```sh
npm run new
```

Scribere will ask for the date, title, slug, status, and optional tags or series. It writes a new `content/YYYY/MM/DD/NN-slug/article.md` with the correct frontmatter and a starter body that includes the title and byline.

If you already have a draft body, you can pipe it in:

```sh
npm run new < draft.md
```

### Edit an article

To change the title, status, tags, or series later, run:

```sh
npm run edit
```

The script asks for the article path, then updates only the frontmatter fields. If you pipe in a new body, it replaces the body while keeping the frontmatter:

```sh
npm run edit < updated-body.md
```

You can also pass a path or URL directly:

```sh
npm run edit -- content/2026/01/12/01-sample/article.md
npm run edit -- https://my-user-id.github.io/my-big-blog/content/2026/01/12/01-sample/
```

### Check or rebuild manually

If you want a manual check outside the dev loop:

```sh
npm run lint
npm run build
npm run rebuild
```

## Publish and deploy

### Publish your changes

```sh
npm run publish
```

This runs the prose linter and blocks only on high‑severity issues. If it passes, it stages changes, commits, and pushes to `origin`. GitHub Actions then builds and publishes the site.

### Deploy on GitHub Pages

To deploy, push the repo to GitHub (the setup step already commits and pushes). Then enable GitHub Pages:

1. Open your repo on GitHub.
2. Go to Settings → Pages.
3. In the Build and deployment section, choose GitHub Actions as the source.

After the first Actions run, your site will be live at:

```
https://my-user-id.github.io/my-big-blog/
```

### Setting up a custom domain

If you want a custom domain later, set it up in three short steps:

1. In your repo, go to Settings → Pages and enter your domain in the Custom domain field. Save it.
2. GitHub will show the exact DNS records to add. Go to your DNS provider and add those records (usually A records for the apex, and a CNAME for `www` if you use it).
3. Wait for DNS to update. When it is live, your site will load at the custom domain.

Then update your local blog so all links, feeds, and sitemaps use the custom domain:

```sh
npm run domain
```

Scribere will ask for your custom domain and update `content/site.json` with the new `siteUrl` and `customDomain`.
