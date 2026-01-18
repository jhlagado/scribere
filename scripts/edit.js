#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const ROOT = process.cwd();
const CONTENT_ROOT = path.join(ROOT, "content");
const STATUS_VALUES = new Set(["draft", "review", "published", "archived"]);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (question, fallback) => {
  if (!process.stdin.isTTY) {
    return Promise.resolve(fallback || "");
  }
  const suffix = fallback ? ` [${fallback}]` : "";
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      const value = answer.trim();
      resolve(value || fallback || "");
    });
  });
};

const promptRequired = async (question, fallback) => {
  let value = "";
  while (!value) {
    value = (await prompt(question, fallback)).trim();
  }
  return value;
};

const readStdin = () => {
  if (process.stdin.isTTY) {
    return "";
  }
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
};

const normaliseTag = (value) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
};

const resolveFromUrl = (value) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const pathname = decodeURIComponent(url.pathname || "");
  if (!pathname) {
    return null;
  }
  let relPath = null;
  if (pathname.includes("/content/")) {
    relPath = pathname.split("/content/")[1];
  } else if (pathname.match(/^\/?\d{4}\/\d{2}\/\d{2}\/\d{2}-/)) {
    relPath = pathname.replace(/^\\/+/, "");
  }
  if (!relPath) {
    return null;
  }
  relPath = relPath.replace(/\\/+$|\\/+$/, "");
  if (!relPath.endsWith("article.md")) {
    relPath = path.join(relPath, "article.md");
  }
  return path.join(CONTENT_ROOT, relPath);
};

const resolveArticlePath = (input) => {
  if (!input) {
    return null;
  }
  let candidate = input.trim();
  if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
    const urlPath = resolveFromUrl(candidate);
    if (urlPath) {
      candidate = urlPath;
    }
  }
  if (!path.isAbsolute(candidate)) {
    candidate = path.join(ROOT, candidate);
  }
  if (!fs.existsSync(candidate)) {
    const alt = path.join(CONTENT_ROOT, input.trim());
    if (fs.existsSync(alt)) {
      candidate = alt;
    }
  }
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    candidate = path.join(candidate, "article.md");
  }
  if (!fs.existsSync(candidate)) {
    return null;
  }
  return candidate;
};

const stripQuotes = (value) => {
  if (!value) {
    return "";
  }
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const getSimpleField = (frontmatter, key) => {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  if (!match) {
    return "";
  }
  return stripQuotes(match[1]);
};

const getTags = (frontmatter) => {
  const match = frontmatter.match(/^tags:\s*(?:\n[ \t-].*)*/m);
  if (!match) {
    return [];
  }
  return match[0]
    .split("\n")
    .slice(1)
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter(Boolean);
};

const setOrAppendLine = (frontmatter, key, lineValue) => {
  const pattern = new RegExp(`^${key}:.*$`, "m");
  if (pattern.test(frontmatter)) {
    return frontmatter.replace(pattern, lineValue);
  }
  return `${frontmatter.trimEnd()}\n${lineValue}`;
};

const removeLine = (frontmatter, key) => {
  const pattern = new RegExp(`^${key}:.*\n?`, "m");
  return frontmatter.replace(pattern, "");
};

const replaceTagsBlock = (frontmatter, tags) => {
  const blockRegex = /^tags:\s*(?:\n[ \t-].*)*/m;
  if (!tags.length) {
    return frontmatter.replace(blockRegex, "");
  }
  const block = `tags:\n${tags.map((tag) => `  - ${tag}`).join("\n")}`;
  if (blockRegex.test(frontmatter)) {
    return frontmatter.replace(blockRegex, block);
  }
  return `${frontmatter.trimEnd()}\n${block}`;
};

async function main() {
  if (!fs.existsSync(CONTENT_ROOT)) {
    throw new Error("Missing /content. Run setup first.");
  }

  const cliArg = process.argv.slice(2).join(" ").trim();
  const inputPath = cliArg || (await promptRequired("Article path, folder, or URL"));
  const articlePath = resolveArticlePath(inputPath);

  if (!articlePath) {
    throw new Error("Article file not found. Provide a path under /content or a published URL.");
  }

  const raw = fs.readFileSync(articlePath, "utf8");
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) {
    throw new Error("Missing frontmatter in article.");
  }

  let frontmatter = match[1];
  let body = raw.slice(match[0].length);

  const existingTitle = getSimpleField(frontmatter, "title");
  const existingStatus = getSimpleField(frontmatter, "status");
  const existingSeries = getSimpleField(frontmatter, "series");
  const existingTags = getTags(frontmatter);

  const titleInput = await prompt("Title", existingTitle || "");
  const title = titleInput.trim() || existingTitle;
  if (!title) {
    throw new Error("Title is required.");
  }

  let statusInput = await prompt("Status (draft/review/published/archived)", existingStatus || "draft");
  statusInput = statusInput.trim() || existingStatus || "draft";
  statusInput = statusInput.toLowerCase();
  if (!STATUS_VALUES.has(statusInput)) {
    console.warn("[edit] Invalid status. Using draft.");
    statusInput = "draft";
  }

  const seriesInput = await prompt("Series (optional, '-' to clear)", existingSeries || "");
  let series = seriesInput.trim();
  if (series === "-") {
    series = "";
  } else if (!series) {
    series = existingSeries;
  }

  const tagsDefault = existingTags.join(", ");
  const tagsInput = await prompt("Tags (comma-separated, '-' to clear)", tagsDefault);
  let tags = existingTags;
  if (tagsInput.trim() === "-") {
    tags = [];
  } else if (tagsInput.trim()) {
    tags = tagsInput
      .split(",")
      .map(normaliseTag)
      .filter(Boolean);
  }

  frontmatter = setOrAppendLine(frontmatter, "title", `title: \"${title.replace(/"/g, "\\\"")}\"`);
  frontmatter = setOrAppendLine(frontmatter, "status", `status: ${statusInput}`);

  if (series) {
    frontmatter = setOrAppendLine(frontmatter, "series", `series: ${series}`);
  } else {
    frontmatter = removeLine(frontmatter, "series");
  }

  frontmatter = replaceTagsBlock(frontmatter, tags);
  frontmatter = frontmatter.replace(/\n{3,}/g, "\n\n").trim();

  const stdinBody = readStdin();
  if (stdinBody.trim()) {
    body = stdinBody.trimEnd();
    if (!body.endsWith("\n")) {
      body += "\n";
    }
  }

  const updated = `---\n${frontmatter}\n---\n${body}`;
  fs.writeFileSync(articlePath, updated);

  console.log("\n[edit] Article updated:");
  console.log(`- File: ${articlePath}`);
}

main()
  .catch((error) => {
    console.error(`\n[edit] ${error.message}`);
    process.exit(1);
  })
  .finally(() => rl.close());
