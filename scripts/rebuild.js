#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = process.cwd();
const SCRIBERE_ROOT = path.resolve(__dirname, "..");
const buildScript = path.join(SCRIBERE_ROOT, "scripts", "build.js");

fs.rmSync(path.join(ROOT, "temp", "index.json"), { force: true });

const result = spawnSync(process.execPath, [buildScript], {
  stdio: "inherit",
  cwd: ROOT,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);
