#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const ROOT = process.cwd();
const SITE_PATH = path.join(ROOT, "content", "site.json");

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

const readJson = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
};

const resolveDomain = (value) => {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return null;
  }
  let urlValue = trimmed;
  if (!/^[a-z]+:\/\//i.test(urlValue)) {
    urlValue = `https://${urlValue}`;
  }
  try {
    const parsed = new URL(urlValue);
    return {
      domain: parsed.hostname,
      siteUrl: parsed.origin,
    };
  } catch {
    return null;
  }
};

async function main() {
  const siteJson = readJson(SITE_PATH);
  if (!siteJson) {
    throw new Error("Missing content/site.json. Run setup before setting a domain.");
  }

  const argValue = process.argv.slice(2).join(" ").trim();
  const fallback = siteJson.customDomain || "";
  const input = argValue || (await prompt("Custom domain (e.g. my-blog.com)", fallback));
  const resolved = resolveDomain(input);

  if (!resolved) {
    throw new Error("Could not parse a domain. Use my-blog.com or https://my-blog.com.");
  }

  siteJson.customDomain = resolved.domain;
  siteJson.siteUrl = resolved.siteUrl;

  writeJson(SITE_PATH, siteJson);

  console.log(`[domain] Updated content/site.json.`);
  console.log(`- siteUrl: ${resolved.siteUrl}`);
  console.log(`- customDomain: ${resolved.domain}`);
}

main()
  .catch((error) => {
    console.error(`\n[domain] ${error.message}`);
    process.exit(1);
  })
  .finally(() => rl.close());
