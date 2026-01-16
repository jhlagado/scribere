#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const lintResult = spawnSync(
  npmCmd,
  ["run", "-s", "lint", "--", "--all", "--report-path", "temp/lint-report.json"],
  { stdio: "inherit", cwd: ROOT },
);

if (lintResult.error) {
  throw lintResult.error;
}

if (lintResult.status !== 0) {
  console.log("[lint] issues (non-blocking)");
}

const buildEnv = {
  ...process.env,
  INCREMENTAL: "1",
  SOFT_FAIL: "1",
  LINT_REPORT_PATH: "temp/lint-report.json",
};

const buildResult = spawnSync(process.execPath, ["scripts/build.js"], {
  stdio: "inherit",
  cwd: ROOT,
  env: buildEnv,
});

if (buildResult.error) {
  throw buildResult.error;
}

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

console.log("[build] ok");
