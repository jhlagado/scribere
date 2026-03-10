#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const SCRIBERE_ROOT = path.resolve(__dirname, "..");
const lintScript = path.join(SCRIBERE_ROOT, "scripts", "prose-lint.js");
const buildScript = path.join(SCRIBERE_ROOT, "scripts", "build.js");
const lintReportPath = path.join(ROOT, "temp", "lint-report.json");

function isTruthy(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

function writeEmptyLintReport() {
  fs.mkdirSync(path.dirname(lintReportPath), { recursive: true });
  fs.writeFileSync(
    lintReportPath,
    `${JSON.stringify({ checked: 0, skipped: 0, totalIssues: 0, totalScore: 0, reports: [] }, null, 2)}\n`,
  );
}

const skipProseLint = isTruthy(process.env.SKIP_PROSE_LINT) || isTruthy(process.env.DISABLE_PROSE_LINT);

if (skipProseLint) {
  writeEmptyLintReport();
  console.log("[lint] skipped");
} else {
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
}

const host = process.env.HOST || "127.0.0.1";
const buildEnv = {
  ...process.env,
  INCREMENTAL: "1",
  SOFT_FAIL: "1",
  LINT_REPORT_PATH: "temp/lint-report.json",
  SITE_URL: `http://${host}:8000`,
  BASE_PATH: "",
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
