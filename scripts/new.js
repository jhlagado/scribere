#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const ROOT = process.cwd();
const CONTENT_ROOT = path.join(ROOT, "content");
const STATUS_VALUES = new Set(["draft", "review", "published", "archived"]);
const MAX_SLUG_LENGTH = 80;

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

const slugify = (value) => {
  return value
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
};

const toTitleCase = (value) => {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const parseDateInput = (value) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
};

const pad2 = (value) => String(value).padStart(2, "0");

const readSiteAuthor = () => {
  const sitePath = path.join(CONTENT_ROOT, "site.json");
  if (!fs.existsSync(sitePath)) {
    return "";
  }
  try {
    const site = JSON.parse(fs.readFileSync(sitePath, "utf8"));
    return typeof site.author === "string" ? site.author : "";
  } catch {
    return "";
  }
};

const nextOrdinal = (dir) => {
  if (!fs.existsSync(dir)) {
    return 1;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const ordinals = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name.match(/^(\d{2})-/))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  if (!ordinals.length) {
    return 1;
  }
  return Math.max(...ordinals) + 1;
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

const buildFrontmatter = ({ status, title, summary, series, tags }) => {
  const lines = ["---", `title: \"${title}\"`, `status: ${status}`];

  if (series) {
    lines.push(`series: ${series}`);
  }

  if (summary) {
    lines.push(`summary: \"${summary}\"`);
  }

  if (tags && tags.length) {
    lines.push("tags:");
    for (const tag of tags) {
      lines.push(`  - ${tag}`);
    }
  }

  lines.push("---");
  return lines.join("\n");
};

async function main() {
  if (!fs.existsSync(CONTENT_ROOT)) {
    throw new Error("Missing /content. Run setup first.");
  }

  const today = new Date();
  const todayValue = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;

  let dateInput = await promptRequired("Date (YYYY-MM-DD)", todayValue);
  let parsedDate = parseDateInput(dateInput);
  while (!parsedDate) {
    console.error("[new] Invalid date format. Use YYYY-MM-DD.");
    dateInput = await promptRequired("Date (YYYY-MM-DD)", todayValue);
    parsedDate = parseDateInput(dateInput);
  }

  const title = await promptRequired("Title");
  const slugDefault = slugify(title) || "new-article";
  let slug = await prompt("Slug", slugDefault);
  slug = slugify(slug) || slugDefault;

  if (slug.length > MAX_SLUG_LENGTH) {
    console.warn(`[new] Slug trimmed to ${MAX_SLUG_LENGTH} characters.`);
    slug = slug.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
  }

  let status = await prompt("Status (draft/review/published/archived)", "draft");
  status = status.toLowerCase();
  if (!STATUS_VALUES.has(status)) {
    console.warn("[new] Invalid status. Using draft.");
    status = "draft";
  }

  const summary = await prompt("Summary (optional, two sentences)", "");
  const series = await prompt("Series (optional)", "");
  const tagsInput = await prompt("Tags (comma-separated, optional)", "");

  const tags = tagsInput
    .split(",")
    .map(normaliseTag)
    .filter(Boolean);

  const yearDir = path.join(CONTENT_ROOT, String(parsedDate.year));
  const monthDir = path.join(yearDir, pad2(parsedDate.month));
  const dayDir = path.join(monthDir, pad2(parsedDate.day));

  const ordinal = nextOrdinal(dayDir);
  if (ordinal > 99) {
    throw new Error("Too many articles for this date (ordinal exceeds 99).");
  }

  const leaf = `${pad2(ordinal)}-${slug}`;
  const articleDir = path.join(dayDir, leaf);

  if (fs.existsSync(articleDir)) {
    throw new Error(`Article folder already exists: ${articleDir}`);
  }

  fs.mkdirSync(articleDir, { recursive: true });

  const frontmatter = buildFrontmatter({
    status,
    title,
    summary,
    series: series.trim() || "",
    tags,
  });

  const author = readSiteAuthor() || "Your Name";
  const body = `# ${title}\nBy ${author}\n\n`;

  fs.writeFileSync(path.join(articleDir, "article.md"), `${frontmatter}\n${body}`);

  console.log("\n[new] Article created:");
  console.log(articleDir);
}

main()
  .catch((error) => {
    console.error(`\n[new] ${error.message}`);
    process.exit(1);
  })
  .finally(() => rl.close());
