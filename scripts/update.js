#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const SCRIBERE_REF = "github:jhlagado/scribere";
const REQUIRED_SCRIPTS = {
  start: "node node_modules/scribere/scripts/start.js",
  build: "node node_modules/scribere/scripts/build.js",
  rebuild: "node node_modules/scribere/scripts/rebuild.js",
  new: "node node_modules/scribere/scripts/new.js",
  edit: "node node_modules/scribere/scripts/edit.js",
  domain: "node node_modules/scribere/scripts/domain.js",
  lint: "node node_modules/scribere/scripts/prose-lint.js",
  update: "node node_modules/scribere/scripts/update.js",
  publish: "node node_modules/scribere/scripts/publish.js",
  setup: "node node_modules/scribere/scripts/setup.js",
};

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: "inherit", cwd: ROOT, ...options });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const readJson = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
};

const ensureGitignore = () => {
  const gitignorePath = path.join(ROOT, ".gitignore");
  const required = ["/node_modules/", "/build/", "/temp/"];
  let existing = "";
  if (fs.existsSync(gitignorePath)) {
    existing = fs.readFileSync(gitignorePath, "utf8");
  }
  const lines = new Set(existing.split(/\r?\n/).filter(Boolean));
  let changed = false;
  for (const entry of required) {
    if (!lines.has(entry)) {
      lines.add(entry);
      changed = true;
    }
  }
  if (changed || !fs.existsSync(gitignorePath)) {
    const next = Array.from(lines).join("\n");
    fs.writeFileSync(gitignorePath, `${next}\n`);
  }
};

const ensureAgents = () => {
  const agentsPath = path.join(ROOT, "AGENTS.md");
  if (fs.existsSync(agentsPath)) {
    return;
  }
  fs.writeFileSync(
    agentsPath,
    "Scribere docs live in `node_modules/scribere/docs/`. Use those specs and the skills folder when editing content or scripts.\n"
  );
};

const warnIfMissing = (label, filePath) => {
  if (!fs.existsSync(filePath)) {
    console.log(`[update] Missing ${label}: ${filePath}`);
  }
};

const status = spawnSync("git", ["status", "--porcelain"], {
  encoding: "utf8",
  cwd: ROOT,
});

if (status.error) {
  throw status.error;
}

if ((status.stdout || "").trim()) {
  console.log("[update] Working tree has changes. Update will continue and may add new changes.");
}

const packageJsonPath = path.join(ROOT, "package.json");
const pkg = readJson(packageJsonPath);
if (!pkg) {
  throw new Error("[update] Missing package.json. Run setup first.");
}

pkg.dependencies = pkg.dependencies || {};
pkg.scripts = pkg.scripts || {};

if (pkg.dependencies.scribere !== SCRIBERE_REF) {
  pkg.dependencies.scribere = SCRIBERE_REF;
}

for (const [name, command] of Object.entries(REQUIRED_SCRIPTS)) {
  if (pkg.scripts[name] !== command) {
    pkg.scripts[name] = command;
  }
}

writeJson(packageJsonPath, pkg);

ensureGitignore();
ensureAgents();
warnIfMissing("content folder", path.join(ROOT, "content"));
warnIfMissing("site config", path.join(ROOT, "content", "site.json"));
warnIfMissing("queries", path.join(ROOT, "content", "queries.json"));

run("npm", ["install", `scribere@${SCRIBERE_REF}`]);

console.log("[update] Scribere updated. Review changes and commit when ready.");
