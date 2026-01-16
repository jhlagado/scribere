#!/usr/bin/env node
"use strict";

const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const devBuildScript = path.join("scripts", "dev-build.js");
const nodemonBin = path.join(
  ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "nodemon.cmd" : "nodemon",
);

if (!fs.existsSync(nodemonBin)) {
  console.error("[dev] nodemon is missing. Run `npm install` first.");
  process.exit(1);
}

const devBuildResult = spawnSync(process.execPath, [devBuildScript], {
  stdio: "inherit",
  cwd: ROOT,
});

if (devBuildResult.error) {
  throw devBuildResult.error;
}

if (devBuildResult.status !== 0) {
  process.exit(devBuildResult.status ?? 1);
}

const host = process.env.HOST || "127.0.0.1";
const server = spawn(process.execPath, ["scripts/serve.js"], {
  stdio: "inherit",
  cwd: ROOT,
  env: { ...process.env, HOST: host },
});

console.log("[dev] watching for changes");

const watcher = spawn(
  nodemonBin,
  [
    "--quiet",
    "--on-change-only",
    "--exitcrash",
    "--watch",
    "content",
    "--watch",
    "example",
    "--watch",
    "config",
    "--ignore",
    "build",
    "--ext",
    "md,html,css,js,json,svg",
    devBuildScript,
  ],
  { stdio: "inherit", cwd: ROOT },
);

let shuttingDown = false;

const shutdown = (code) => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  if (watcher && !watcher.killed) {
    watcher.kill("SIGTERM");
  }

  if (server && !server.killed) {
    server.kill("SIGTERM");
  }

  if (typeof code === "number") {
    process.exit(code);
  }
};

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

watcher.on("exit", (code) => {
  shutdown(code ?? 0);
});

server.on("exit", (code) => {
  if (!shuttingDown && code && code !== 0) {
    console.error(`[dev] server exited (${code})`);
  }
});
