#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const ROOT = process.cwd();
const SCRIBERE_ROOT = path.resolve(__dirname, "..");
const lintScript = path.join(SCRIBERE_ROOT, "scripts", "prose-lint.js");

const runGit = (args, options = {}) => {
  const result = spawnSync("git", args, {
    stdio: "inherit",
    cwd: ROOT,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const readGitConfig = (key) => {
  const result = spawnSync("git", ["config", "--get", key], {
    encoding: "utf8",
    cwd: ROOT,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    return "";
  }

  return String(result.stdout || "").trim();
};

const lintResult = spawnSync(
  process.execPath,
  [
    lintScript,
    "--all",
    "--gate",
    "--max-high=0",
    "--max-medium=999",
    "--max-low=999",
  ],
  { stdio: "inherit", cwd: ROOT },
);

if (lintResult.error) {
  throw lintResult.error;
}

if (lintResult.status !== 0) {
  console.error("[publish] high-severity lint issues detected. Fix them before publishing.");
  process.exit(lintResult.status ?? 1);
}

const authorName = readGitConfig("user.name");
const authorEmail = readGitConfig("user.email");

if (!authorName || !authorEmail) {
  console.error("[publish] git user name/email are not configured.");
  console.error("[publish] run: git config --global user.name \"Your Name\"");
  console.error("[publish] run: git config --global user.email \"you@example.com\"");
  process.exit(1);
}

const originCheck = spawnSync("git", ["remote", "get-url", "origin"], {
  encoding: "utf8",
  cwd: ROOT,
});

if (originCheck.error) {
  throw originCheck.error;
}

if (originCheck.status !== 0) {
  console.error("[publish] missing git remote \"origin\".");
  console.error("[publish] add one with: git remote add origin <your-repo-url>");
  process.exit(1);
}

const status = spawnSync("git", ["status", "--porcelain"], {
  encoding: "utf8",
  cwd: ROOT,
});

if (status.error) {
  throw status.error;
}

if (status.status !== 0) {
  process.exit(status.status ?? 1);
}

const changes = (status.stdout || "").trim();
if (!changes) {
  console.log("[publish] nothing to commit");
  process.exit(0);
}

runGit(["add", "-A"]);

const message = process.env.PUBLISH_MESSAGE || "Publish updates";
const commit = spawnSync("git", ["commit", "-m", message], {
  stdio: "inherit",
  cwd: ROOT,
});

if (commit.error) {
  throw commit.error;
}

if (commit.status !== 0) {
  console.error("[publish] commit failed. Ensure your git user name/email is set.");
  process.exit(commit.status ?? 1);
}

runGit(["push"]);
