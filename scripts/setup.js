#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const ROOT = process.cwd();
const CONTENT_ROOT = path.join(ROOT, 'content');
const EXAMPLE_INSTANCE = fs.existsSync(path.join(ROOT, 'example'))
  ? path.join(ROOT, 'example')
  : path.resolve(__dirname, '..', 'example');
const UPSTREAM_REMOTE = 'upstream';
const UPSTREAM_URL = 'https://github.com/jhlagado/scribere.git';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyDir(source, dest) {
  const entries = fs.readdirSync(source, { withFileTypes: true });
  ensureDir(dest);
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function prompt(question, fallback) {
  if (!process.stdin.isTTY) {
    return Promise.resolve(fallback || '');
  }
  const suffix = fallback ? ` [${fallback}]` : '';
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      const value = answer.trim();
      resolve(value || fallback || '');
    });
  });
}

function deriveBasePath(siteUrl) {
  if (!siteUrl) {
    return '';
  }
  try {
    const parsed = new URL(siteUrl);
    const pathName = parsed.pathname || '';
    if (!pathName || pathName === '/') {
      return '';
    }
    return pathName.replace(/\/$/, '');
  } catch {
    return '';
  }
}

function assertExampleInstance() {
  if (!fs.existsSync(EXAMPLE_INSTANCE)) {
    throw new Error('Missing /example. The engine ships with an example instance.');
  }
}

function hasFiles(dirPath) {
  return fs.existsSync(dirPath) && fs.readdirSync(dirPath).length > 0;
}

function ensureUpstreamRemote() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
  } catch {
    console.warn('[setup] Git repo not detected. Skipping upstream remote setup.');
    return;
  }

  try {
    execSync(`git remote get-url ${UPSTREAM_REMOTE}`, { stdio: 'ignore' });
  } catch {
    try {
      execSync(`git remote add ${UPSTREAM_REMOTE} ${UPSTREAM_URL}`, { stdio: 'ignore' });
      console.log(`[setup] Added ${UPSTREAM_REMOTE} remote.`);
    } catch {
      console.warn('[setup] Could not add upstream remote.');
      return;
    }
  }

  try {
    execSync(`git fetch ${UPSTREAM_REMOTE}`, { stdio: 'ignore' });
    console.log(`[setup] Fetched ${UPSTREAM_REMOTE}.`);
  } catch {
    console.warn('[setup] Could not fetch upstream.');
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  assertExampleInstance();
  ensureUpstreamRemote();

  const defaults = fs.existsSync(path.join(EXAMPLE_INSTANCE, 'site.json'))
    ? readJson(path.join(EXAMPLE_INSTANCE, 'site.json'))
    : {
        siteName: 'My Blog',
        siteDescription: 'Short description used in feeds and meta tags.',
        siteUrl: 'https://example.com',
        customDomain: '',
        author: 'Your Name',
        language: 'en-AU'
      };

  const siteName = await prompt('Site name', defaults.siteName);
  const siteDescription = await prompt('Site description', defaults.siteDescription);
  const siteUrl = await prompt('Site URL', defaults.siteUrl);
  const customDomain = await prompt('Custom domain (optional)', defaults.customDomain);
  const author = await prompt('Author name', defaults.author);
  const language = await prompt('Language tag', defaults.language);

  const instanceDir = CONTENT_ROOT;
  if (hasFiles(instanceDir)) {
    console.log('[setup] content/ already exists. Skipping copy and metadata prompts.');
    const siteJsonPath = path.join(instanceDir, 'site.json');
    if (!fs.existsSync(siteJsonPath)) {
      console.warn('[setup] Missing content/site.json. Create it before building.');
    }
    return;
  }

  copyDir(EXAMPLE_INSTANCE, instanceDir);

  const siteJsonPath = path.join(instanceDir, 'site.json');
  if (fs.existsSync(siteJsonPath)) {
    const siteJson = readJson(siteJsonPath);
    siteJson.siteName = siteName;
    siteJson.siteDescription = siteDescription;
    siteJson.siteUrl = siteUrl;
    siteJson.customDomain = customDomain;
    siteJson.author = author;
    siteJson.language = language;
    writeJson(siteJsonPath, siteJson);
  }

  const basePath = deriveBasePath(siteUrl);
  if (basePath) {
    console.log(`[setup] Detected site path '${basePath}'. If you are using GitHub Pages project sites, set BASE_PATH=${basePath} in your Pages workflow.`);
  } else {
    console.log('[setup] If you are using a custom domain at the root, leave BASE_PATH empty.');
  }

  console.log('\nSetup complete.');
  console.log('- Instance folder: content/');
  console.log('Next: npm install, then npm start.');
}

main()
  .catch((error) => {
    console.error(`\n[setup] ${error.message}`);
    process.exit(1);
  })
  .finally(() => {
    rl.close();
  });
