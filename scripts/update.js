#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");

const ROOT = process.cwd();

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

if ((status.stdout || "").trim()) {
  console.error("[update] working tree is not clean. Commit or stash changes first.");
  process.exit(1);
}

const checkUpstream = spawnSync("git", ["remote", "get-url", "upstream"], {
  stdio: "ignore",
  cwd: ROOT,
});

if (checkUpstream.status !== 0) {
  runGit(["remote", "add", "upstream", "https://github.com/jhlagado/scribere.git"]);
}

runGit(["fetch", "upstream"]);
runGit(["merge", "--no-edit", "upstream/main"]);
