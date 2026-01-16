#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

fs.rmSync(path.join(ROOT, "temp", "index.json"), { force: true });

const result = spawnSync(npmCmd, ["run", "-s", "build"], {
  stdio: "inherit",
  cwd: ROOT,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);
