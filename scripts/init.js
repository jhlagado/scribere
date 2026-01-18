#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const readline = require("node:readline");

const ROOT = process.cwd();
const SCRIBERE_ROOT = path.resolve(__dirname, "..");
const EXAMPLE_ROOT = path.join(SCRIBERE_ROOT, "example");
const DEFAULT_DESCRIPTION = "A personal blog built with Scribere.";
const DEFAULT_LANGUAGE = "en-AU";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (question, fallback) => {
  if (!process.stdin.isTTY) {
    return Promise.resolve(fallback || "");
  }
  const suffix = fallback ? ` [${fallback}]` : "";
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      const value = answer.trim();
      resolve(value || fallback || "");
    });
  });
};

const promptRequired = async (question) => {
  let answer = "";
  while (!answer) {
    answer = (await prompt(question, "")).trim();
  }
  return answer;
};

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runCapture = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.error) {
    return "";
  }
  if (result.status !== 0) {
    return "";
  }
  return (result.stdout || "").trim();
};

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const isDirEmpty = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    return true;
  }
  return fs.readdirSync(dirPath).length === 0;
};

const copyDir = (source, dest) => {
  const entries = fs.readdirSync(source, { withFileTypes: true });
  ensureDir(dest);
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

const writeFileIfMissing = (filePath, contents) => {
  if (fs.existsSync(filePath)) {
    return false;
  }
  fs.writeFileSync(filePath, contents);
  return true;
};

const toTitleCase = (value) => {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const parseGitRemote = (remote) => {
  if (!remote) {
    return null;
  }
  const trimmed = remote.trim();
  const httpsMatch = trimmed.match(/https?:\/\/[^/]+\/([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }
  const sshMatch = trimmed.match(/^[^@]+@[^:]+:([^/]+)\/(.+?)(?:\.git)?$/i);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }
  return null;
};

const createWorkflow = (siteUrl) => {
  return `name: Deploy Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"
      - name: Install
        run: npm ci
      - name: Build
        run: npm run build
        env:
          SITE_URL: ${siteUrl}
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: build

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;
};

async function main() {
  const remoteUrl = await promptRequired("Git remote HTTPS URL");
  const parsedRemote = parseGitRemote(remoteUrl);
  const defaultFolder = parsedRemote?.repo || "my-blog";
  const projectFolder = await prompt("Project folder", defaultFolder);
  const repoName = await prompt("Repository name", parsedRemote?.repo || path.basename(projectFolder));

  const gitUser = runCapture("git", ["config", "--get", "user.name"], { cwd: ROOT });
  const authorDefault = parsedRemote?.owner || gitUser || "Your Name";
  const derivedOwner = parsedRemote?.owner;
  const siteUrlDefault = derivedOwner
    ? `https://${derivedOwner}.github.io/${repoName}`
    : "https://example.com";

  const siteName = await prompt("Site name", toTitleCase(repoName));
  const siteDescription = await prompt("Site description", DEFAULT_DESCRIPTION);
  const siteUrl = await prompt("Site URL", siteUrlDefault);
  const customDomain = await prompt("Custom domain (optional)", "");
  const author = await prompt("Author name", authorDefault);
  const language = await prompt("Language tag", DEFAULT_LANGUAGE);

  const targetRoot = path.resolve(ROOT, projectFolder);
  ensureDir(targetRoot);

  if (!isDirEmpty(targetRoot)) {
    console.error(`[init] ${targetRoot} is not empty. Choose an empty folder.`);
    process.exit(1);
  }

  run("git", ["init", "-b", "main"], { cwd: targetRoot });

  const packageJson = {
    name: repoName,
    private: true,
    scripts: {
      start: "node node_modules/scribere/scripts/start.js",
      build: "node node_modules/scribere/scripts/build.js",
      rebuild: "node node_modules/scribere/scripts/rebuild.js",
      new: "node node_modules/scribere/scripts/new.js",
      lint: "node node_modules/scribere/scripts/prose-lint.js",
      update: "node node_modules/scribere/scripts/update.js",
      publish: "node node_modules/scribere/scripts/publish.js",
      setup: "node node_modules/scribere/scripts/setup.js",
    },
    dependencies: {
      scribere: "github:jhlagado/scribere",
    },
  };

  const packagePath = path.join(targetRoot, "package.json");
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + "\n");

  writeFileIfMissing(
    path.join(targetRoot, ".gitignore"),
    "/node_modules/\n/build/\n/temp/\n.DS_Store\n"
  );

  writeFileIfMissing(
    path.join(targetRoot, "README.md"),
    `# ${siteName}\n\nThis blog uses Scribere. Edit content in \`content/\` and run \`npm start\` for a local preview.\n`
  );

  writeFileIfMissing(
    path.join(targetRoot, "AGENTS.md"),
    "Scribere docs live in `node_modules/scribere/docs/`. Use those specs and the skills folder when editing content or scripts.\n"
  );

  run("npm", ["install"], { cwd: targetRoot });

  const contentRoot = path.join(targetRoot, "content");
  copyDir(EXAMPLE_ROOT, contentRoot);

  const siteJsonPath = path.join(contentRoot, "site.json");
  if (fs.existsSync(siteJsonPath)) {
    const siteJson = JSON.parse(fs.readFileSync(siteJsonPath, "utf8"));
    siteJson.siteName = siteName;
    siteJson.siteDescription = siteDescription;
    siteJson.siteUrl = siteUrl;
    siteJson.customDomain = customDomain;
    siteJson.author = author;
    siteJson.language = language;
    fs.writeFileSync(siteJsonPath, JSON.stringify(siteJson, null, 2) + "\n");
  }

  const workflowDir = path.join(targetRoot, ".github", "workflows");
  ensureDir(workflowDir);
  writeFileIfMissing(path.join(workflowDir, "deploy-pages.yml"), createWorkflow(siteUrl));

  run("git", ["add", "."], { cwd: targetRoot });
  run("git", ["commit", "-m", "Initial blog setup"], { cwd: targetRoot });

  const hasOrigin = Boolean(runCapture("git", ["remote", "get-url", "origin"], { cwd: targetRoot }));
  if (!hasOrigin && remoteUrl) {
    run("git", ["remote", "add", "origin", remoteUrl], { cwd: targetRoot });
  }

  const shouldPush = Boolean(
    runCapture("git", ["remote", "get-url", "origin"], { cwd: targetRoot })
  );

  if (shouldPush) {
    run("git", ["push", "-u", "origin", "main"], { cwd: targetRoot });
  } else {
    console.log("[init] No git remote found. Add origin and push when ready.");
  }

  console.log("\nSetup complete.");
  console.log(`- Folder: ${targetRoot}`);
  console.log(`- Next:\n  cd ${targetRoot}\n  npm start`);
}

main()
  .catch((error) => {
    console.error(`\n[init] ${error.message}`);
    process.exit(1);
  })
  .finally(() => rl.close());
