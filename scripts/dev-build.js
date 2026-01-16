#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const ROOT = process.cwd();
const SCRIBERE_ROOT = path.resolve(__dirname, "..");
const lintScript = path.join(SCRIBERE_ROOT, "scripts", "prose-lint.js");
const buildScript = path.join(SCRIBERE_ROOT, "scripts", "build.js");

const lintResult = spawnSync(
  process.execPath,
  [lintScript, "--all", "--report-path", "temp/lint-report.json"],
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

const buildResult = spawnSync(process.execPath, [buildScript], {
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
