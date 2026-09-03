#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const ROOT = process.cwd();
const SCRIBERE_ROOT = path.resolve(__dirname, "..");
const buildScript = path.join(SCRIBERE_ROOT, "scripts", "build.js");

const host = process.env.HOST || "127.0.0.1";
const buildEnv = {
  ...process.env,
  INCREMENTAL: "1",
  SOFT_FAIL: "1",
  SCRIBERE_PREVIEW: "1",
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
