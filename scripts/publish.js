#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

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

const lintResult = spawnSync(
  npmCmd,
  [
    "run",
    "-s",
    "lint",
    "--",
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
