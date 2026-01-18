#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const ROOT = process.cwd();
const CONTENT_ROOT = fs.existsSync(path.join(ROOT, "content"))
  ? path.join(ROOT, "content")
  : path.join(ROOT, "example");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (question) => {
  if (!process.stdin.isTTY) {
    return Promise.resolve("");
  }
  return new Promise((resolve) => {
    rl.question(`${question}: `, (answer) => {
      resolve(answer.trim());
    });
  });
};

const walk = (dir, results) => {
  if (!fs.existsSync(dir)) {
    return;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, results);
      continue;
    }
    if (entry.isFile() && entry.name === "article.md") {
      results.push(fullPath);
    }
  }
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

const parseFrontmatter = (raw) => {
  if (!raw.startsWith("---")) {
    return { title: "", status: "", tags: [], series: "", summary: "" };
  }
  const end = raw.indexOf("\n---", 3);
  if (end === -1) {
    return { title: "", status: "", tags: [], series: "", summary: "" };
  }
  const frontmatter = raw.slice(0, end + 4);
  const getSimpleField = (key) => {
    const match = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
    if (!match) {
      return "";
    }
    return stripQuotes(match[1]);
  };
  const tagsMatch = frontmatter.match(/^tags:\s*(?:\n[ \t-].*)*/m);
  const tags = tagsMatch
    ? tagsMatch[0]
        .split("\n")
        .slice(1)
        .map((line) => line.replace(/^\s*-\s*/, "").trim())
        .filter(Boolean)
    : [];
  return {
    title: getSimpleField("title"),
    status: getSimpleField("status"),
    series: getSimpleField("series"),
    summary: getSimpleField("summary"),
    tags,
  };
};

const parseArgs = (args) => {
  const options = {
    query: "",
    status: "",
    limit: 0,
  };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--limit") {
      options.limit = Number.parseInt(args[i + 1] || "0", 10);
      i += 1;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      options.limit = Number.parseInt(arg.split("=")[1] || "0", 10);
      continue;
    }
    if (arg === "--status") {
      options.status = (args[i + 1] || "").trim().toLowerCase();
      i += 1;
      continue;
    }
    if (!options.query) {
      options.query = arg.trim();
    }
  }
  return options;
};

const buildSearchText = (record) => {
  return [
    record.title,
    record.summary,
    record.series,
    record.tags.join(" "),
    record.relativePath,
  ]
    .join(" ")
    .toLowerCase();
};

const formatRecord = (record) => {
  const tags = record.tags.length ? ` | tags: ${record.tags.join(", ")}` : "";
  const series = record.series ? ` | series: ${record.series}` : "";
  const status = record.status ? ` | status: ${record.status}` : "";
  const title = record.title || "Untitled";
  return `${title}\n  ${record.relativePath}${status}${series}${tags}`;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (!options.query) {
    options.query = await prompt("Search term");
  }
  rl.close();

  if (!options.query) {
    console.log("Provide a search term. Example: npm run find -- \"templating\"");
    process.exit(1);
  }

  const articlePaths = [];
  walk(CONTENT_ROOT, articlePaths);
  const records = articlePaths.map((filePath) => {
    const raw = fs.readFileSync(filePath, "utf8");
    const frontmatter = parseFrontmatter(raw);
    const relativePath = path.relative(ROOT, filePath);
    return {
      ...frontmatter,
      relativePath,
      filePath,
    };
  });

  const needle = options.query.toLowerCase();
  const matches = records.filter((record) => {
    if (options.status && record.status.toLowerCase() !== options.status) {
      return false;
    }
    return buildSearchText(record).includes(needle);
  });

  matches.sort((a, b) => b.relativePath.localeCompare(a.relativePath));

  const limited = options.limit > 0 ? matches.slice(0, options.limit) : matches;
  if (!limited.length) {
    console.log(`No matches for "${options.query}".`);
    process.exit(0);
  }

  console.log(`Found ${matches.length} match(es):`);
  for (const record of limited) {
    console.log(formatRecord(record));
  }
};

main();
