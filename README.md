# Scribere

Scribere is a small blogging engine that turns plain Markdown folders into a static site. You create a repo for your blog, run one command, and Scribere builds the site from the `content/` folder it creates for you.

## Create a blog

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
Repository name [my-big-blog]:
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
cd /path/to/my-big-blog
npm start
```

That runs the local preview and rebuilds when files change.

## Deploy on GitHub Pages

To deploy, push the repo to GitHub (the setup step already commits and pushes). Enable GitHub Pages by opening the repo on GitHub and going to Settings → Pages, then choose GitHub Actions as the source. After the first Actions run, your site will be live at:

```
https://my-user-id.github.io/my-big-blog/
```

### Setting up a custom domain

If you want a custom domain later, set it up in three short steps:

1. In your repo, go to Settings → Pages and enter your domain in the Custom domain field. Save it.
2. GitHub will show the exact DNS records to add. Go to your DNS provider and add those records (usually A records for the apex, and a CNAME for `www` if you use it).
3. Wait for DNS to update. When it is live, your site will load at the custom domain.
