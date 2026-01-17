#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'build');
const CONFIG_PATH = path.join(ROOT, 'site-config.json');

const DEFAULT_SITE_CONFIG = {
  siteName: 'Scribere',
  siteDescription: 'A small, opinionated engine for plain HTML blogs.',
  siteUrl: 'https://example.com',
  customDomain: '',
  author: 'Example Author',
  language: 'en-AU'
};

const DEFAULT_META_CONFIG = [
  { tag: 'meta', attrs: { name: 'description' }, valueKey: 'meta-description' },
  { tag: 'meta', attrs: { property: 'og:site_name' }, valueKey: 'og-site-name' },
  { tag: 'meta', attrs: { property: 'og:title' }, valueKey: 'og-title' },
  { tag: 'meta', attrs: { property: 'og:description' }, valueKey: 'og-description' },
  { tag: 'meta', attrs: { property: 'og:url' }, valueKey: 'og-url' },
  { tag: 'meta', attrs: { property: 'og:type' }, valueKey: 'og-type' },
  { tag: 'meta', attrs: { property: 'og:image' }, valueKey: 'og-image' },
  { tag: 'meta', attrs: { name: 'twitter:card' }, valueKey: 'twitter-card' },
  { tag: 'meta', attrs: { name: 'twitter:title' }, valueKey: 'twitter-title' },
  { tag: 'meta', attrs: { name: 'twitter:description' }, valueKey: 'twitter-description' },
  { tag: 'meta', attrs: { name: 'twitter:image' }, valueKey: 'twitter-image' },
  { tag: 'meta', attrs: { property: 'article:published_time' }, valueKey: 'article-published-time' },
  { tag: 'meta', attrs: { property: 'article:section' }, valueKey: 'article-section' },
  { tag: 'meta', attrs: { name: 'color-scheme' }, valueKey: 'color-scheme' },
  { tag: 'meta', attrs: { name: 'theme-color' }, valueKey: 'theme-color' },
  { tag: 'link', attrs: { rel: 'canonical' }, valueKey: 'canonical-url', valueAttr: 'href' },
  {
    tag: 'link',
    attrs: { rel: 'alternate', type: 'application/rss+xml' },
    valueKey: 'feed-url',
    valueAttr: 'href',
    titleKey: 'site-name'
  },
  { tag: 'title', valueKey: 'page-title', valueAttr: 'text' }
];

const BASE_SITE_CONFIG = { ...DEFAULT_SITE_CONFIG };
const INSTANCE_ROOT = resolveInstanceRoot(ROOT);
const INSTANCE_SITE_PATH = path.join(INSTANCE_ROOT, 'site.json');
const INSTANCE_SITE = loadInstanceSite(INSTANCE_SITE_PATH);
const SITE_CONFIG = applySiteOverrides(BASE_SITE_CONFIG, INSTANCE_SITE.site, INSTANCE_SITE_PATH);
const META_CONFIG = resolveMetaConfig(INSTANCE_SITE.meta, path.join(INSTANCE_ROOT, 'meta.json'), DEFAULT_META_CONFIG);
const INSTANCE_TEMPLATES_DIR = path.join(INSTANCE_ROOT, 'templates');
const INSTANCE_ASSETS_DIR = path.join(INSTANCE_ROOT, 'assets');
const INSTANCE_QUERIES_PATH = path.join(INSTANCE_ROOT, 'queries.json');
const QUERIES_PATH = INSTANCE_QUERIES_PATH;
const ARCHIVE_OUTPUT_ROOT = path.join(OUTPUT_DIR, 'content');
const ARCHIVE_ROOT_PATH = '/content/';

const SITE_URL = process.env.SITE_URL || SITE_CONFIG.siteUrl;
const BASE_PATH = normalizeBasePath(
  process.env.BASE_PATH !== undefined
    ? process.env.BASE_PATH
    : deriveBasePathFromUrl(SITE_URL)
);
const CUSTOM_DOMAIN = process.env.CUSTOM_DOMAIN || SITE_CONFIG.customDomain;
const SITE_NAME = SITE_CONFIG.siteName;
const SITE_DESCRIPTION = SITE_CONFIG.siteDescription;
const SITE_LANGUAGE = SITE_CONFIG.language;
const FEED_AUTHOR = SITE_CONFIG.author;
const META_COLOR_SCHEME = 'light';
const META_THEME_COLOR = '#ffffff';
const LINT_REPORT_PATH = resolveLintReportPath(process.env.LINT_REPORT_PATH);
const LINT_REPORT = loadLintReport(LINT_REPORT_PATH);
const LINT_REPORTS_BY_PATH = LINT_REPORT ? buildLintReportMap(LINT_REPORT) : null;
const SOFT_FAIL = process.env.SOFT_FAIL === '1';
const BUILD_REPORT_PATH = resolveBuildReportPath(process.env.BUILD_REPORT_PATH);
const BUILD_WARNINGS = [];
const INDEX_CACHE_PATH = path.join(ROOT, 'temp', 'index.json');
const INDEX_CACHE_VERSION = 1;
const INCREMENTAL = isTruthy(process.env.INCREMENTAL);

const ARTICLE_TEMPLATE = resolveTemplatePath('article.html');
const INDEX_TEMPLATE = resolveTemplatePath('summary-index.html');
const ABOUT_TEMPLATE = resolveTemplatePath('about.html');
const FEED_PATH = path.join(OUTPUT_DIR, 'feed.xml');
const SITEMAP_PATH = path.join(OUTPUT_DIR, 'sitemap.xml');
const ROBOTS_PATH = path.join(OUTPUT_DIR, 'robots.txt');

const STATUS_VALUES = new Set(['draft', 'review', 'published', 'archived']);
const INTERNAL_QUERY_NAMES = new Set(['article-page']);
const ALLOWED_CONTENT_ROOT_DIRS = new Set(['assets', 'templates']);
const MAX_SLUG_LENGTH = 80;
const MAX_ASSET_NAME_LENGTH = 80;
const ALLOWED_QUERY_KEYS = new Set([
  'source',
  'status',
  'tag',
  'series',
  'year',
  'month',
  'day',
  'ordinal',
  'sort',
  'limit'
]);
const ALLOWED_SORTS = new Set(['date-asc', 'date-desc', 'ordinal-asc', 'ordinal-desc']);
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

function isTruthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

function deriveBasePathFromUrl(siteUrl) {
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

function main() {
  if (fs.existsSync(CONFIG_PATH)) {
    recordBuildWarning('site-config.json is ignored; move settings into content/site.json.');
  }
  const articles = discoverArticles(INSTANCE_ROOT);
  const inputSignatures = collectInputSignatures();
  const cache = loadIndexCache(INDEX_CACHE_PATH);
  const cacheMatches = cache
    && cache.version === INDEX_CACHE_VERSION
    && cache.inputs
    && cache.inputs.signature === inputSignatures.signature;
  const useCache = INCREMENTAL && cacheMatches;
  if (INCREMENTAL && !useCache) {
    recordBuildWarning('Incremental cache unavailable; falling back to a full rebuild.');
  }

  const { index, changes, cache: nextCache } = buildIndex(articles, {
    cache,
    useCache,
    trackChanges: INCREMENTAL && useCache,
    inputs: inputSignatures
  });
  const queries = loadQueries(QUERIES_PATH);
  const queryResults = executeQueries(index, queries);
  if (INCREMENTAL && useCache) {
    renderSiteIncremental(index, queryResults, changes);
  } else {
    renderSite(index, queryResults);
  }
  writeCname();
  copyStaticAssets();
  if (INCREMENTAL && useCache) {
    copyAssetsIncremental(index, changes);
  } else {
    copyAssets(index);
  }
  writeIndexCache(INDEX_CACHE_PATH, nextCache);
  writeBuildReport();
  flushBuildWarnings();
}

function loadIndexCache(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== INDEX_CACHE_VERSION) {
      return null;
    }
    if (!parsed.articles || typeof parsed.articles !== 'object') {
      return null;
    }
    return parsed;
  } catch (error) {
    recordBuildWarning(`Failed to read incremental cache at ${filePath}.`);
    return null;
  }
}

function writeIndexCache(filePath, cache) {
  if (!cache) {
    return;
  }
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(cache, null, 2)}\n`);
}

function collectInputSignatures() {
  const templateFiles = listFilesRecursive(INSTANCE_TEMPLATES_DIR);
  const configFiles = [
    INSTANCE_SITE_PATH,
    INSTANCE_QUERIES_PATH,
    path.join(INSTANCE_ROOT, 'meta.json')
  ];
  const signature = buildInputSignature([...templateFiles, ...configFiles]);
  return {
    signature,
    templates: buildInputSignature(templateFiles),
    config: buildInputSignature(configFiles)
  };
}

function buildInputSignature(paths) {
  const entries = paths
    .map((entry) => String(entry))
    .sort()
    .map((filePath) => {
      if (!fs.existsSync(filePath)) {
        return `${filePath}:missing`;
      }
      const stats = fs.statSync(filePath);
      return `${filePath}:${stats.size}:${stats.mtimeMs}`;
    });
  return entries.join('|');
}

function listFilesRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

function buildArticleSignature(filePath) {
  const stats = fs.statSync(filePath);
  return { size: stats.size, mtimeMs: stats.mtimeMs };
}

function signaturesMatch(left, right) {
  if (!left || !right) {
    return false;
  }
  return left.size === right.size && left.mtimeMs === right.mtimeMs;
}

function cloneFrontmatter(frontmatter) {
  if (!frontmatter || typeof frontmatter !== 'object') {
    return frontmatter;
  }
  const clone = { ...frontmatter };
  if (Array.isArray(clone.tags)) {
    clone.tags = [...clone.tags];
  }
  return clone;
}

function buildIndexEntry(record, frontmatter) {
  return {
    ...record,
    yearNum: Number(record.year),
    monthNum: Number(record.month),
    dayNum: Number(record.day),
    ordinalNum: Number(record.ordinal),
    publicPath: `/${record.relDir}/`,
    frontmatter
  };
}

function buildCachedEntry(cached) {
  if (!cached || !cached.record) {
    return null;
  }
  const record = cached.record;
  const dir = path.join(ROOT, record.relDir);
  return buildIndexEntry({
    year: record.year,
    month: record.month,
    day: record.day,
    ordinal: record.ordinal,
    slug: record.slug,
    relDir: record.relDir,
    dir,
    mdPath: path.join(dir, 'article.md')
  }, cached.frontmatter);
}

function normalizeBasePath(raw) {
  let base = String(raw || '').trim();
  if (!base || base === '/') {
    return '';
  }
  if (!base.startsWith('/')) {
    base = `/${base}`;
  }
  return base.replace(/\/+$/, '');
}

function resolveLintReportPath(raw) {
  if (!raw) {
    return null;
  }
  const value = String(raw).trim();
  if (!value) {
    return null;
  }
  if (path.isAbsolute(value)) {
    return value;
  }
  return path.join(ROOT, value);
}

function resolveBuildReportPath(raw) {
  if (!raw) {
    return path.join(ROOT, 'temp', 'build-report.json');
  }
  const value = String(raw).trim();
  if (!value) {
    return path.join(ROOT, 'temp', 'build-report.json');
  }
  if (path.isAbsolute(value)) {
    return value;
  }
  return path.join(ROOT, value);
}

function recordBuildWarning(message) {
  if (!message) {
    return;
  }
  BUILD_WARNINGS.push(message);
}

function flushBuildWarnings() {
  if (!BUILD_WARNINGS.length) {
    return;
  }
  const lines = BUILD_WARNINGS.map((warning) => `- ${warning}`);
  console.warn(`[build] warnings:\n${lines.join('\n')}`);
}

function writeBuildReport() {
  if (!BUILD_REPORT_PATH) {
    return;
  }
  if (!LINT_REPORT && BUILD_WARNINGS.length === 0) {
    return;
  }
  ensureDir(path.dirname(BUILD_REPORT_PATH));
  const payload = {
    generatedAt: new Date().toISOString(),
    softFail: SOFT_FAIL,
    warnings: BUILD_WARNINGS.slice(),
    lintReportPath: LINT_REPORT_PATH || null,
    lintReport: LINT_REPORT || null
  };
  writeFile(BUILD_REPORT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}

function handleBuildErrors(errors, contextLabel) {
  if (!errors.length) {
    return;
  }
  if (!SOFT_FAIL) {
    throw new Error(errors.join('\n'));
  }
  for (const message of errors) {
    const prefix = contextLabel ? `${contextLabel}: ` : '';
    recordBuildWarning(`${prefix}${message}`);
  }
}

function loadLintReport(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.reports)) {
      return null;
    }
    return parsed;
  } catch (error) {
    return null;
  }
}

function buildLintReportMap(report) {
  const map = new Map();
  for (const entry of report.reports || []) {
    if (!entry || !entry.filePath) {
      continue;
    }
    map.set(path.resolve(entry.filePath), entry);
  }
  return map;
}

function loadInstanceSite(filePath) {
  if (!fs.existsSync(filePath)) {
    return { site: null, meta: null };
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Instance site config must be a JSON object: ${filePath}`);
  }

  const { meta, ...site } = parsed;
  if (Object.prototype.hasOwnProperty.call(site, 'contentDir')) {
    recordBuildWarning(`Ignoring deprecated contentDir in ${filePath}; content now lives at /content/.`);
    delete site.contentDir;
  }

  const allowedKeys = new Set([
    'siteName',
    'siteDescription',
    'siteUrl',
    'customDomain',
    'author',
    'language'
  ]);

  for (const [key, value] of Object.entries(site)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Unknown site config key '${key}' in ${filePath}`);
    }
    if (value !== undefined && value !== null && typeof value !== 'string') {
      throw new Error(`Site config '${key}' must be a string in ${filePath}`);
    }
  }

  let metaEntries = null;
  if (meta !== undefined) {
    if (!Array.isArray(meta)) {
      throw new Error(`Site meta must be a JSON array: ${filePath}`);
    }
    metaEntries = meta;
  }

  return { site, meta: metaEntries };
}

function applySiteOverrides(base, overrides, filePath) {
  if (!overrides || !Object.keys(overrides).length) {
    return base;
  }
  const merged = { ...base, ...overrides };
  validateSiteConfig(merged, filePath);
  return merged;
}

function resolveMetaConfig(metaOverride, filePath, defaults) {
  if (Array.isArray(metaOverride)) {
    return normalizeMetaConfigArray(metaOverride, filePath);
  }
  return loadMetaConfig(filePath, defaults);
}

function loadMetaConfig(filePath, defaults) {
  if (!fs.existsSync(filePath)) {
    return defaults.map((entry) => ({ ...entry, attrs: { ...entry.attrs } }));
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Meta config must be a JSON array: ${filePath}`);
  }

  return normalizeMetaConfigArray(parsed, filePath);
}

function normalizeMetaConfigArray(entries, filePath) {
  return entries.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`Invalid meta entry in ${filePath}`);
    }
    return {
      tag: entry.tag,
      attrs: entry.attrs || {},
      valueKey: entry.valueKey,
      valueAttr: entry.valueAttr,
      titleKey: entry.titleKey
    };
  });
}

function validateSiteConfig(config, filePath) {
  const errors = [];
  const stringFields = [
    'siteName',
    'siteDescription',
    'siteUrl',
    'customDomain',
    'author',
    'language'
  ];

  for (const field of stringFields) {
    const value = config[field];
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value !== 'string') {
      errors.push(`${field} must be a string`);
    }
  }

  if (errors.length) {
    throw new Error(`Invalid site config in ${filePath}:\n${errors.join('\n')}`);
  }
}

function resolveInstanceRoot(rootDir) {
  const contentRoot = path.join(rootDir, 'content');
  const exampleRoot = path.join(rootDir, 'example');
  if (fs.existsSync(contentRoot)) {
    return contentRoot;
  }
  if (fs.existsSync(exampleRoot)) {
    return exampleRoot;
  }
  throw new Error('Missing /content and /example. Create /content via setup, or keep /example for defaults.');
}

function resolveTemplatePath(filename) {
  const instancePath = path.join(INSTANCE_TEMPLATES_DIR, filename);
  if (!fs.existsSync(instancePath)) {
    throw new Error(`Missing template: ${filename}`);
  }
  return instancePath;
}

function applySiteHrefs(html) {
  let output = applyHrefAttributes(html, {
    'archive-root': ARCHIVE_ROOT_PATH
  });
  output = applyAttributePlaceholders(output, {
    'site-name': SITE_NAME
  });
  return output;
}

function applyBasePath(html) {
  if (!BASE_PATH) {
    return html;
  }
  let output = html;
  output = output.replace(/(href|src)=\"\/(?!\/)/g, `$1="${BASE_PATH}/`);
  output = output.replace(/url\(\/(?!\/)/g, `url(${BASE_PATH}/`);
  return output;
}

function writeCname() {
  if (!CUSTOM_DOMAIN) {
    return;
  }
  writeFile(path.join(OUTPUT_DIR, 'CNAME'), `${CUSTOM_DOMAIN}\n`);
}

function discoverArticles(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const errors = [];
  const records = [];

  const yearDirs = listDirs(rootDir);
  for (const year of yearDirs) {
    if (!/^\d{4}$/.test(year)) {
      if (ALLOWED_CONTENT_ROOT_DIRS.has(year)) {
        continue;
      }
      errors.push(`Invalid year directory: ${year}`);
      continue;
    }
    const yearPath = path.join(rootDir, year);
    const monthDirs = listDirs(yearPath);
    for (const month of monthDirs) {
      if (!/^\d{2}$/.test(month)) {
        errors.push(`Invalid month directory: ${path.join(year, month)}`);
        continue;
      }
      const monthPath = path.join(yearPath, month);
      const dayDirs = listDirs(monthPath);
      for (const day of dayDirs) {
        if (!/^\d{2}$/.test(day)) {
          errors.push(`Invalid day directory: ${path.join(year, month, day)}`);
          continue;
        }
        const dayPath = path.join(monthPath, day);
        const leafDirs = listDirs(dayPath);
        for (const leaf of leafDirs) {
          const match = leaf.match(/^(\d{2})-([a-z0-9-]+)$/);
          if (!match) {
            errors.push(`Invalid article directory: ${path.join(year, month, day, leaf)}`);
            continue;
          }
          const ordinal = match[1];
          const slug = match[2];
          const leafPath = path.join(dayPath, leaf);

          if (!leaf.startsWith(`${ordinal}-`)) {
            errors.push(`Ordinal mismatch in directory: ${path.join(year, month, day, leaf)}`);
            continue;
          }

          if (slug.length > MAX_SLUG_LENGTH) {
            const message = `Slug too long (${slug.length}/${MAX_SLUG_LENGTH}) in ${path.join(year, month, day, leaf)}`;
            if (SOFT_FAIL) {
              recordBuildWarning(message);
            } else {
              errors.push(message);
            }
          }

          const mdFiles = fs.readdirSync(leafPath)
            .filter((file) => file.toLowerCase().endsWith('.md'));
          if (mdFiles.length !== 1 || mdFiles[0] !== 'article.md') {
            errors.push(`Missing or ambiguous article markdown file in ${path.join(year, month, day, leaf)}`);
            continue;
          }

          const assetsPath = path.join(leafPath, 'assets');
          if (fs.existsSync(assetsPath)) {
            const assetFiles = listFilesRecursive(assetsPath);
            for (const filePath of assetFiles) {
              const filename = path.basename(filePath);
              if (filename.length > MAX_ASSET_NAME_LENGTH) {
                const relPath = toPosix(path.relative(ROOT, filePath));
                const message = `Asset name too long (${filename.length}/${MAX_ASSET_NAME_LENGTH}) in ${relPath}`;
                if (SOFT_FAIL) {
                  recordBuildWarning(message);
                } else {
                  errors.push(message);
                }
              }
            }
          }

          const relDir = toPosix(path.relative(ROOT, leafPath));
          records.push({
            year,
            month,
            day,
            ordinal,
            slug,
            relDir,
            dir: leafPath,
            mdPath: path.join(leafPath, 'article.md')
          });
        }
      }
    }
  }

  if (errors.length) {
    handleBuildErrors(errors, 'Discover');
  }

  return records;
}

function buildIndex(records, options = {}) {
  const errors = [];
  const index = [];
  const changes = {
    changed: new Map(),
    removed: new Map()
  };
  const useCache = Boolean(options.useCache && options.cache && options.cache.articles);
  const cachedArticles = useCache ? options.cache.articles : {};
  const trackChanges = Boolean(options.trackChanges && useCache);
  const nextCache = {
    version: INDEX_CACHE_VERSION,
    generatedAt: new Date().toISOString(),
    inputs: options.inputs || null,
    articles: {}
  };
  const seen = new Set();

  for (const record of records) {
    seen.add(record.relDir);
    const cached = cachedArticles[record.relDir];
    const signature = buildArticleSignature(record.mdPath);
    let frontmatter = null;
    let parsed = false;

    if (useCache && cached && signaturesMatch(cached.signature, signature)) {
      frontmatter = cloneFrontmatter(cached.frontmatter);
    }

    if (!frontmatter) {
      const raw = fs.readFileSync(record.mdPath, 'utf8');
      const parsedResult = parseFrontmatter(raw);
      parsed = true;

      if (!parsedResult) {
        if (SOFT_FAIL) {
          recordBuildWarning(`Missing frontmatter in ${record.relDir}/article.md (defaulting to draft)`);
          frontmatter = { status: 'draft' };
        } else {
          errors.push(`Missing frontmatter in ${record.relDir}/article.md`);
          continue;
        }
      } else {
        frontmatter = parsedResult.frontmatter;
      }
    }

    if (!frontmatter.status || !STATUS_VALUES.has(frontmatter.status)) {
      if (SOFT_FAIL) {
        recordBuildWarning(`Invalid or missing status in ${record.relDir}/article.md (defaulting to draft)`);
        frontmatter.status = 'draft';
      } else {
        errors.push(`Invalid or missing status in ${record.relDir}/article.md`);
      }
    }

    for (const derivedField of ['year', 'month', 'day', 'ordinal', 'slug']) {
      if (Object.prototype.hasOwnProperty.call(frontmatter, derivedField)) {
        errors.push(`Frontmatter defines derived field '${derivedField}' in ${record.relDir}/article.md`);
      }
    }

    if (Object.prototype.hasOwnProperty.call(frontmatter, 'stream')) {
      errors.push(`Frontmatter includes deprecated 'stream' field in ${record.relDir}/article.md`);
    }

    if (frontmatter.tags) {
      if (!Array.isArray(frontmatter.tags)) {
        if (SOFT_FAIL) {
          recordBuildWarning(`Tags must be a list in ${record.relDir}/article.md (coercing to list)`);
          if (typeof frontmatter.tags === 'string' || typeof frontmatter.tags === 'number') {
            frontmatter.tags = String(frontmatter.tags)
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean);
          } else {
            frontmatter.tags = [];
          }
        } else {
          errors.push(`Tags must be a list in ${record.relDir}/article.md`);
        }
      } else {
        frontmatter.tags = frontmatter.tags
          .map((tag) => normalizeTag(tag))
          .filter(Boolean);
      }
    }
    if (frontmatter.series) {
      if (typeof frontmatter.series !== 'string' && !SOFT_FAIL) {
        errors.push(`Frontmatter 'series' must be a string in ${record.relDir}/article.md`);
      }
      frontmatter.series = normalizeTag(frontmatter.series);
    }

    for (const key of ['title', 'summary', 'thumbnail']) {
      if (frontmatter[key] && typeof frontmatter[key] !== 'string') {
        if (SOFT_FAIL) {
          recordBuildWarning(`Frontmatter '${key}' must be a string in ${record.relDir}/article.md (dropping value)`);
          delete frontmatter[key];
        } else {
          errors.push(`Frontmatter '${key}' must be a string in ${record.relDir}/article.md`);
        }
      }
    }

    const entry = buildIndexEntry(record, frontmatter);
    index.push(entry);

    nextCache.articles[record.relDir] = {
      signature,
      frontmatter,
      record: {
        year: record.year,
        month: record.month,
        day: record.day,
        ordinal: record.ordinal,
        slug: record.slug,
        relDir: record.relDir
      }
    };

    if (trackChanges) {
      const oldEntry = cached ? buildCachedEntry(cached) : null;
      if (!cached || parsed) {
        changes.changed.set(record.relDir, { oldEntry, newEntry: entry });
      }
    }
  }

  if (trackChanges) {
    for (const [relDir, cached] of Object.entries(cachedArticles)) {
      if (!seen.has(relDir)) {
        changes.removed.set(relDir, { oldEntry: buildCachedEntry(cached) });
      }
    }
  }

  if (errors.length) {
    handleBuildErrors(errors, 'Frontmatter');
  }

  return { index, changes, cache: nextCache };
}

function loadQueries(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing queries file: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}`);
  }

  const errors = [];
  for (const [name, query] of Object.entries(parsed)) {
    if (!query || typeof query !== 'object') {
      errors.push(`Query '${name}' must be an object`);
      continue;
    }

    for (const key of Object.keys(query)) {
      if (!ALLOWED_QUERY_KEYS.has(key)) {
        errors.push(`Unknown key '${key}' in query '${name}'`);
      }
    }

    if (query.source !== 'blog') {
      errors.push(`Query '${name}' must include source: "blog"`);
    }

    if (query.status && !STATUS_VALUES.has(query.status)) {
      errors.push(`Query '${name}' has invalid status '${query.status}'`);
    }

    if (query.sort && !ALLOWED_SORTS.has(query.sort)) {
      errors.push(`Query '${name}' has invalid sort '${query.sort}'`);
    }

    if (query.limit !== undefined) {
      if (!Number.isInteger(query.limit) || query.limit <= 0) {
        errors.push(`Query '${name}' has invalid limit '${query.limit}'`);
      }
    }

    validateQueryField(query, name, errors, 'year');
    validateQueryField(query, name, errors, 'month');
    validateQueryField(query, name, errors, 'day');
    validateQueryField(query, name, errors, 'ordinal');

    if (query.tag && typeof query.tag !== 'string') {
      errors.push(`Query '${name}' has invalid tag`);
    }
    if (query.series && typeof query.series !== 'string') {
      errors.push(`Query '${name}' has invalid series`);
    }

  }

  if (errors.length) {
    throw new Error(errors.join('\n'));
  }

  return parsed;
}

function executeQueries(index, queries) {
  const results = {};
  for (const [name, query] of Object.entries(queries)) {
    let items = index.slice();

    if (query.status) {
      items = items.filter((item) => item.frontmatter.status === query.status);
    }

    if (query.tag) {
      const tag = normalizeTag(query.tag);
      items = items.filter((item) => (item.frontmatter.tags || []).includes(tag));
    }
    if (query.series) {
      items = items.filter((item) => item.frontmatter.series === query.series);
    }


    items = applyEqualityOrRange(items, query, 'year');
    items = applyEqualityOrRange(items, query, 'month');
    items = applyEqualityOrRange(items, query, 'day');
    items = applyEqualityOrRange(items, query, 'ordinal');

    if (query.sort) {
      items.sort(makeSortFn(query.sort));
    }

    if (query.limit) {
      items = items.slice(0, query.limit);
    }

    results[name] = items;
  }

  return results;
}

function renderSite(index, queryResults) {
  cleanDir(OUTPUT_DIR);
  ensureDir(OUTPUT_DIR);

  const published = queryResults['all-published-posts']
    ? queryResults['all-published-posts'].slice()
    : index.filter((item) => item.frontmatter.status === 'published').sort(makeSortFn('date-asc'));

  const indexTemplate = fs.readFileSync(INDEX_TEMPLATE, 'utf8');
  const homeBody = buildArticleListSection('latest-posts');
  const homeExtra = buildYearListSection(published, ARCHIVE_ROOT_PATH, 'Years');
  const renderQueries = LINT_REPORTS_BY_PATH
    ? {
        ...queryResults,
        'latest-posts': sortItems(
          index.filter((item) => item.frontmatter.status !== 'archived'),
          'date-desc'
        ).slice(0, 25)
      }
    : queryResults;
  const homeHtml = renderTemplate(
    applySlots(
      applyMeta(indexTemplate, {
        canonical: joinUrl(SITE_URL, '/'),
        description: SITE_DESCRIPTION,
        title: 'Home'
      }),
      {
        'page-heading': '',
        'page-intro': '',
        'page-body': homeBody,
        'page-extra': homeExtra
      }
    ),
    renderQueries
  );
  writeFile(path.join(OUTPUT_DIR, 'index.html'), homeHtml);

  if (fs.existsSync(ABOUT_TEMPLATE)) {
    const aboutTemplate = fs.readFileSync(ABOUT_TEMPLATE, 'utf8');
    const aboutHtml = renderTemplate(
      applySlots(
        applyMeta(aboutTemplate, {
          canonical: joinUrl(SITE_URL, '/about/'),
          description: SITE_DESCRIPTION,
          title: 'About'
        }),
        {
          'page-title': escapeHtml(composePageTitle('About'))
        }
      ),
      queryResults
    );
    writeFile(path.join(OUTPUT_DIR, 'about', 'index.html'), aboutHtml);
  }

  const articleTemplate = fs.readFileSync(ARTICLE_TEMPLATE, 'utf8');
  const articleCandidates = LINT_REPORTS_BY_PATH
    ? index
    : (queryResults['article-pages'] || []);

  const outputPaths = new Set();

  for (const article of articleCandidates) {
    const perArticleResults = { 'article-page': [article] };
    const articleTitle = articleMetaTitle(article);
    const articleHtml = renderTemplate(
      applySlots(
        applyMeta(articleTemplate, {
          canonical: joinUrl(SITE_URL, article.publicPath),
          description: descriptionForArticle(article),
          title: articleTitle,
          ogType: 'article',
          image: articleOgImage(article),
          publishedTime: articlePublishedTime(article),
          section: article.frontmatter.series || null,
          tags: article.frontmatter.tags || []
        }),
        {
          'page-title': escapeHtml(composePageTitle(articleTitle))
        }
      ),
      perArticleResults
    );

    const outputDir = path.join(OUTPUT_DIR, article.relDir);
    const outputFile = path.join(outputDir, 'index.html');
    const outputRel = toPosix(path.relative(OUTPUT_DIR, outputFile));

    if (outputPaths.has(outputRel)) {
      throw new Error(`Duplicate output path: ${outputRel}`);
    }

    outputPaths.add(outputRel);
    ensureDir(outputDir);
    writeFile(outputFile, articleHtml);
  }

  renderArchiveRoot(published);
  renderYearArchives(published);
  renderMonthArchives(published);
  renderTagArchives(published);
  renderTagIndex(queryResults);
  renderSeriesArchives(published);
  renderSeriesIndex(published);
  renderLintIndex(index);
  renderFeed(queryResults, published);
  renderTagFeeds(published);
  renderSeriesFeeds(published);
  writeSitemap(published);
  writeRobots();
}

function renderSiteIncremental(index, queryResults, changes) {
  ensureDir(OUTPUT_DIR);

  const published = queryResults['all-published-posts']
    ? queryResults['all-published-posts'].slice()
    : index.filter((item) => item.frontmatter.status === 'published').sort(makeSortFn('date-asc'));

  const indexTemplate = fs.readFileSync(INDEX_TEMPLATE, 'utf8');
  const homeBody = buildArticleListSection('latest-posts');
  const homeExtra = buildYearListSection(published, ARCHIVE_ROOT_PATH, 'Years');
  const renderQueries = LINT_REPORTS_BY_PATH
    ? {
        ...queryResults,
        'latest-posts': sortItems(
          index.filter((item) => item.frontmatter.status !== 'archived'),
          'date-desc'
        ).slice(0, 25)
      }
    : queryResults;
  const homeHtml = renderTemplate(
    applySlots(
      applyMeta(indexTemplate, {
        canonical: joinUrl(SITE_URL, '/'),
        description: SITE_DESCRIPTION,
        title: 'Home'
      }),
      {
        'page-heading': '',
        'page-intro': '',
        'page-body': homeBody,
        'page-extra': homeExtra
      }
    ),
    renderQueries
  );
  writeFile(path.join(OUTPUT_DIR, 'index.html'), homeHtml);

  if (fs.existsSync(ABOUT_TEMPLATE)) {
    const aboutTemplate = fs.readFileSync(ABOUT_TEMPLATE, 'utf8');
    const aboutHtml = renderTemplate(
      applySlots(
        applyMeta(aboutTemplate, {
          canonical: joinUrl(SITE_URL, '/about/'),
          description: SITE_DESCRIPTION,
          title: 'About'
        }),
        {
          'page-title': escapeHtml(composePageTitle('About'))
        }
      ),
      queryResults
    );
    writeFile(path.join(OUTPUT_DIR, 'about', 'index.html'), aboutHtml);
  }

  const articleTemplate = fs.readFileSync(ARTICLE_TEMPLATE, 'utf8');
  const articleCandidates = LINT_REPORTS_BY_PATH
    ? index
    : (queryResults['article-pages'] || []);
  const changedRelDirs = new Set(changes.changed.keys());

  for (const article of articleCandidates) {
    if (!changedRelDirs.has(article.relDir)) {
      continue;
    }
    const perArticleResults = { 'article-page': [article] };
    const articleTitle = articleMetaTitle(article);
    const articleHtml = renderTemplate(
      applySlots(
        applyMeta(articleTemplate, {
          canonical: joinUrl(SITE_URL, article.publicPath),
          description: descriptionForArticle(article),
          title: articleTitle,
          ogType: 'article',
          image: articleOgImage(article),
          publishedTime: articlePublishedTime(article),
          section: article.frontmatter.series || null,
          tags: article.frontmatter.tags || []
        }),
        {
          'page-title': escapeHtml(composePageTitle(articleTitle))
        }
      ),
      perArticleResults
    );
    writeFile(path.join(OUTPUT_DIR, article.relDir, 'index.html'), articleHtml);
  }

  for (const [relDir] of changes.removed.entries()) {
    removeDir(path.join(OUTPUT_DIR, relDir));
  }

  const hasChanges = changes.changed.size > 0 || changes.removed.size > 0;
  if (!hasChanges) {
    return;
  }

  const affected = collectAffectedSets(changes);
  renderArchiveRoot(published);

  if (affected.years.size) {
    renderYearArchives(published, affected.years);
  }
  if (affected.months.size) {
    renderMonthArchives(published, affected.months);
  }
  if (affected.tags.size) {
    renderTagArchives(published, affected.tags);
    renderTagFeeds(published, affected.tags);
    renderTagIndex(queryResults);
  }
  if (affected.series.size) {
    renderSeriesArchives(published, affected.series);
    renderSeriesFeeds(published, affected.series);
    renderSeriesIndex(published);
  }

  renderLintIndex(index);
  renderFeed(queryResults, published);
  writeSitemap(published);
  writeRobots();
}

function collectAffectedSets(changes) {
  const affected = {
    years: new Set(),
    months: new Set(),
    tags: new Set(),
    series: new Set()
  };

  const addPublished = (entry) => {
    if (!entry || !entry.frontmatter || entry.frontmatter.status !== 'published') {
      return;
    }
    affected.years.add(entry.year);
    affected.months.add(`${entry.year}-${entry.month}`);
    const tags = entry.frontmatter.tags || [];
    for (const tag of tags) {
      affected.tags.add(tag);
    }
    if (entry.frontmatter.series) {
      affected.series.add(entry.frontmatter.series);
    }
  };

  for (const { oldEntry, newEntry } of changes.changed.values()) {
    addPublished(oldEntry);
    addPublished(newEntry);
  }
  for (const { oldEntry } of changes.removed.values()) {
    addPublished(oldEntry);
  }

  return affected;
}


function renderFeed(queryResults, published) {
  const items = queryResults['latest-posts']
    ? queryResults['latest-posts']
    : published.slice().sort(makeSortFn('date-desc')).slice(0, 25);

  const feed = buildFeedXml({
    title: SITE_NAME,
    link: SITE_URL,
    description: SITE_DESCRIPTION,
    items,
    feedUrl: joinUrl(SITE_URL, '/feed.xml')
  });

  writeFile(FEED_PATH, feed);
}

function renderTagFeeds(published, targetTags = null) {
  const tagMap = groupBy(published.flatMap((article) => {
    const tags = article.frontmatter.tags || [];
    return tags.map((tag) => ({ tag, article }));
  }), (entry) => entry.tag);

  const tags = targetTags ? Array.from(targetTags).sort() : Array.from(tagMap.keys()).sort();
  for (const tag of tags) {
    const entries = tagMap.get(tag);
    if (!entries) {
      continue;
    }
    const items = entries.map((entry) => entry.article).sort(makeSortFn('date-desc'));
    const feed = buildFeedXml({
      title: `Tag: ${tag} - ${SITE_NAME}`,
      link: joinUrl(SITE_URL, `/tags/${tag}/`),
      description: `Tag feed for ${tag}.`,
      items,
      feedUrl: joinUrl(SITE_URL, `/tags/${tag}/feed.xml`)
    });
    writeFile(path.join(OUTPUT_DIR, 'tags', tag, 'feed.xml'), feed);
  }
}

function renderSeriesFeeds(published, targetSeries = null) {
  const seriesMap = groupBy(
    published.filter((item) => item.frontmatter.series),
    (item) => item.frontmatter.series
  );
  const seriesNames = targetSeries
    ? Array.from(targetSeries).sort()
    : Array.from(seriesMap.keys()).sort();

  for (const series of seriesNames) {
    const items = seriesMap.get(series);
    if (!items) {
      continue;
    }
    const ordered = items.slice().sort(makeSortFn('date-asc'));
    const feed = buildFeedXml({
      title: `Series: ${series} - ${SITE_NAME}`,
      link: joinUrl(SITE_URL, `/series/${series}/`),
      description: `Series feed for ${series}.`,
      items: ordered,
      feedUrl: joinUrl(SITE_URL, `/series/${series}/feed.xml`)
    });
    writeFile(path.join(OUTPUT_DIR, 'series', series, 'feed.xml'), feed);
  }
}

function writeSitemap(published) {
  const urls = new Map();
  const latest = published.slice().sort(makeSortFn('date-desc'))[0] || null;

  const addUrl = (pathValue, lastmodArticle) => {
    const loc = joinUrl(SITE_URL, pathValue);
    const lastmod = lastmodArticle ? formatSitemapDate(lastmodArticle) : null;
    if (!urls.has(loc) || (lastmod && urls.get(loc).lastmod < lastmod)) {
      urls.set(loc, { loc, lastmod });
    }
  };

  addUrl('/', latest);
  addUrl('/about/', latest);
  addUrl(ARCHIVE_ROOT_PATH, latest);
  addUrl('/tags/', latest);
  addUrl('/series/', latest);

  for (const article of published) {
    addUrl(article.publicPath, article);
  }

  const years = groupBy(published, (article) => article.year);
  for (const [year, items] of years.entries()) {
    const latestForYear = items.slice().sort(makeSortFn('date-desc'))[0];
    addUrl(`${ARCHIVE_ROOT_PATH}${year}/`, latestForYear);
  }

  const months = groupBy(published, (article) => `${article.year}/${article.month}`);
  for (const [key, items] of months.entries()) {
    const latestForMonth = items.slice().sort(makeSortFn('date-desc'))[0];
    addUrl(`${ARCHIVE_ROOT_PATH}${key}/`, latestForMonth);
  }

  const days = groupBy(published, (article) => `${article.year}/${article.month}/${article.day}`);
  for (const [key, items] of days.entries()) {
    const latestForDay = items.slice().sort(makeSortFn('date-desc'))[0];
    addUrl(`${ARCHIVE_ROOT_PATH}${key}/`, latestForDay);
  }

  const tagMap = groupBy(published.flatMap((article) => {
    const tags = article.frontmatter.tags || [];
    return tags.map((tag) => ({ tag, article }));
  }), (entry) => entry.tag);

  for (const [tag, entries] of tagMap.entries()) {
    const latestForTag = entries.map((entry) => entry.article).sort(makeSortFn('date-desc'))[0];
    addUrl(`/tags/${tag}/`, latestForTag);
    const byYear = groupBy(entries, (entry) => entry.article.year);
    for (const [year, yearEntries] of byYear.entries()) {
      const latestForYear = yearEntries.map((entry) => entry.article).sort(makeSortFn('date-desc'))[0];
      addUrl(`/tags/${tag}/${year}/`, latestForYear);
    }
  }

  const seriesMap = groupBy(
    published.filter((item) => item.frontmatter.series),
    (item) => item.frontmatter.series
  );

  for (const [series, items] of seriesMap.entries()) {
    const latestForSeries = items.slice().sort(makeSortFn('date-desc'))[0];
    addUrl(`/series/${series}/`, latestForSeries);
    const byYear = groupBy(items, (item) => item.year);
    for (const [year, yearEntries] of byYear.entries()) {
      const latestForYear = yearEntries.slice().sort(makeSortFn('date-desc'))[0];
      addUrl(`/series/${series}/${year}/`, latestForYear);
    }
  }

  const sitemap = buildSitemapXml(Array.from(urls.values()));
  writeFile(SITEMAP_PATH, sitemap);
}

function writeRobots() {
  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${joinUrl(SITE_URL, '/sitemap.xml')}`
  ];
  writeFile(ROBOTS_PATH, `${lines.join('\n')}\n`);
}

function buildFeedEnclosure(article) {
  const thumb = article.frontmatter.thumbnail;
  if (!thumb) {
    return '';
  }
  const filePath = path.join(article.dir, thumb);
  if (!fs.existsSync(filePath)) {
    return '';
  }
  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    return '';
  }
  const ext = path.extname(filePath).toLowerCase();
  const typeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };
  const mimeType = typeMap[ext];
  if (!mimeType) {
    return '';
  }
  const url = joinUrl(SITE_URL, joinUrl(article.publicPath, thumb));
  return `      <enclosure url="${escapeHtml(url)}" length="${stats.size}" type="${mimeType}" />`;
}

function escapeCdata(text) {
  return String(text).replace(/]]>/g, ']]]]><![CDATA[>');
}

function absolutizeHtml(html) {
  let output = html;
  output = output.replace(/(href|src)=\"\/(?!\/)([^"]*)\"/g, (_match, attr, relPath) => {
    return `${attr}="${joinUrl(SITE_URL, relPath)}"`;
  });
  output = output.replace(/url\(\/(?!\/)([^)]+)\)/g, (_match, relPath) => {
    return `url(${joinUrl(SITE_URL, relPath)})`;
  });
  return output;
}

function stripFeedHeaderHtml(html, title) {
  let output = String(html || '');
  const escapedTitle = escapeHtml(String(title || ''));
  const titlePattern = escapedTitle
    ? new RegExp(`^<h1>${escapedTitle}<\\/h1>\\s*`, 'i')
    : /^<h1>[^<]*<\/h1>\s*/i;
  output = output.replace(titlePattern, '');
  output = output.replace(/^<p>By [^<]*<\/p>\s*/i, '');
  return output;
}

function buildFeedDescription(article, fallbackLimit = 360) {
  const summary = (article.frontmatter.summary || '').trim();
  if (summary) {
    return stripInlineMarkup(summary);
  }
  const html = stripFeedHeaderHtml(renderArticleBody(article), article.frontmatter.title);
  const text = stripInlineMarkup(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  if (!text) {
    return '';
  }
  if (text.length <= fallbackLimit) {
    return text;
  }
  return `${text.slice(0, fallbackLimit).trim()}…`;
}

function buildFeedXml({ title, link, description, items, feedUrl }) {
  const lastBuild = new Date().toUTCString();
  const channelImage = siteImageUrl();
  const channelLines = [
    '  <channel>',
    `    <title>${escapeHtml(title)}</title>`,
    `    <link>${escapeHtml(link)}</link>`,
    `    <description>${escapeHtml(description)}</description>`,
    `    <lastBuildDate>${lastBuild}</lastBuildDate>`,
    `    <language>${SITE_LANGUAGE}</language>`,
    '    <sy:updatePeriod>daily</sy:updatePeriod>',
    '    <sy:updateFrequency>1</sy:updateFrequency>'
  ];

  if (feedUrl) {
    channelLines.push(`    <atom:link href="${escapeHtml(feedUrl)}" rel="self" type="application/rss+xml" />`);
  }

  if (channelImage) {
    channelLines.push('    <image>');
    channelLines.push(`      <url>${escapeHtml(channelImage)}</url>`);
    channelLines.push(`      <title>${escapeHtml(title)}</title>`);
    channelLines.push(`      <link>${escapeHtml(link)}</link>`);
    channelLines.push('    </image>');
  }

  const feedItems = items.map((article) => {
    const itemTitle = article.frontmatter.title || article.slug || 'Untitled';
    const url = joinUrl(SITE_URL, article.publicPath);
    const pubDate = formatRssDate(article);
    const tags = article.frontmatter.tags || [];
    const categories = tags.map((tag) => `      <category>${escapeHtml(tag)}</category>`).join('\n');
    const bodyHtml = stripFeedHeaderHtml(renderArticleBody(article), itemTitle);
    const encodedHtml = escapeCdata(absolutizeHtml(bodyHtml));
    const enclosure = buildFeedEnclosure(article);
    const descriptionText = buildFeedDescription(article);

    const itemLines = [
      '    <item>',
      `      <title>${escapeHtml(itemTitle)}</title>`,
      `      <link>${escapeHtml(url)}</link>`,
      `      <guid isPermaLink="true">${escapeHtml(url)}</guid>`,
      `      <pubDate>${pubDate}</pubDate>`,
      `      <dc:creator><![CDATA[${escapeCdata(FEED_AUTHOR)}]]></dc:creator>`,
      `      <description><![CDATA[${escapeCdata(descriptionText)}]]></description>`
    ];

    if (categories) {
      itemLines.push(categories);
    }
    if (enclosure) {
      itemLines.push(enclosure);
    }
    itemLines.push(`      <content:encoded><![CDATA[${encodedHtml}]]></content:encoded>`);
    itemLines.push('    </item>');
    return itemLines.join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0"',
    '  xmlns:content="http://purl.org/rss/1.0/modules/content/"',
    '  xmlns:dc="http://purl.org/dc/elements/1.1/"',
    '  xmlns:atom="http://www.w3.org/2005/Atom"',
    '  xmlns:sy="http://purl.org/rss/1.0/modules/syndication/"',
    '>',
    ...channelLines,
    feedItems,
    '  </channel>',
    '</rss>'
  ].join('\n');
}

function formatRssDate(article) {
  const date = new Date(Date.UTC(Number(article.year), Number(article.month) - 1, Number(article.day)));
  return date.toUTCString();
}

function formatDisplayDate(article) {
  const monthLabel = monthName(article.month);
  return `${monthLabel} ${Number(article.day)}, ${article.year}`;
}

function formatSitemapDate(article) {
  return `${article.year}-${article.month}-${article.day}`;
}

function tallyLintSeverities(issues) {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const issue of issues) {
    const severity = issue.severity || 'low';
    if (!counts[severity]) {
      counts[severity] = 0;
    }
    counts[severity] += 1;
  }
  return counts;
}

function buildSitemapXml(entries) {
  const lines = entries.map((entry) => {
    if (entry.lastmod) {
      return [
        '  <url>',
        `    <loc>${escapeHtml(entry.loc)}</loc>`,
        `    <lastmod>${entry.lastmod}</lastmod>`,
        '  </url>'
      ].join('\n');
    }
    return [
      '  <url>',
      `    <loc>${escapeHtml(entry.loc)}</loc>`,
      '  </url>'
    ].join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...lines,
    '</urlset>'
  ].join('\n');
}



function copyAssets(index) {
  for (const article of index) {
    const assetsDir = path.join(article.dir, 'assets');
    if (!fs.existsSync(assetsDir)) {
      continue;
    }
    const destDir = path.join(OUTPUT_DIR, article.relDir, 'assets');
    copyDir(assetsDir, destDir);
  }
}

function copyAssetsIncremental(index, changes) {
  const changedRelDirs = new Set(changes.changed.keys());
  for (const article of index) {
    if (!changedRelDirs.has(article.relDir)) {
      continue;
    }
    const assetsDir = path.join(article.dir, 'assets');
    if (!fs.existsSync(assetsDir)) {
      continue;
    }
    const destDir = path.join(OUTPUT_DIR, article.relDir, 'assets');
    copyDir(assetsDir, destDir);
  }
}

function copyStaticAssets() {
  const destDir = path.join(OUTPUT_DIR, 'assets');
  if (fs.existsSync(INSTANCE_ASSETS_DIR)) {
    copyDir(INSTANCE_ASSETS_DIR, destDir);
  }
}

function renderArchiveRoot(published) {
  const template = fs.readFileSync(INDEX_TEMPLATE, 'utf8');
  const label = 'Archive';
  const pageBody = buildYearListSection(published, ARCHIVE_ROOT_PATH);
  const html = renderTemplate(
    applySlots(
      applyMeta(template, {
        canonical: joinUrl(SITE_URL, ARCHIVE_ROOT_PATH),
        description: SITE_DESCRIPTION,
        title: label
      }),
      {
        'page-heading': buildHeading(label),
        'page-intro': '',
        'page-body': pageBody,
        'page-extra': ''
      }
    ),
    {}
  );
  writeFile(path.join(ARCHIVE_OUTPUT_ROOT, 'index.html'), html);
}

function buildYearList(items, basePath) {
  const yearCounts = countBy(items, (item) => item.year);
  const years = Object.keys(yearCounts).sort((a, b) => Number(b) - Number(a));
  if (!years.length) {
    return '<li class="archive-empty">No posts yet.</li>';
  }
  return years.map((year) => {
    const count = yearCounts[year];
    return `<li><a href="${basePath}${year}/">${escapeHtml(year)}</a> (${count})</li>`;
  }).join('\n');
}

function buildYearListSection(items, basePath, headingText = '') {
  const heading = headingText ? `<h2>${escapeHtml(headingText)}</h2>\n` : '';
  const listItems = buildYearList(items, basePath);
  return `${heading}<ul class="archive-years">\n${listItems}\n</ul>`;
}

function buildSummaryListSection(queryName, emptyText = 'No posts yet.') {
  const empty = escapeHtml(emptyText);
  return [
    '<ul class="summary-list">',
    `  <template data-query="${queryName}" data-view="summary-list">`,
    `    <li class="summary-empty">${empty}</li>`,
    '  </template>',
    '</ul>'
  ].join('\n');
}

function buildArticleListSection(queryName, emptyText = 'No posts yet.') {
  const empty = escapeHtml(emptyText);
  return [
    '<div class="series-entries">',
    `  <template data-query="${queryName}" data-view="article-full">`,
    `    <p class="summary-empty">${empty}</p>`,
    '  </template>',
    '</div>'
  ].join('\n');
}

function buildTagListSection(queryName, emptyText = 'No tags yet.') {
  const empty = escapeHtml(emptyText);
  return [
    '<ul class="index-list">',
    `  <template data-query="${queryName}" data-view="tag-list">`,
    `    <li class="archive-empty">${empty}</li>`,
    '  </template>',
    '</ul>'
  ].join('\n');
}

function buildHeading(text, level = 1) {
  if (!text) {
    return '';
  }
  const safeText = escapeHtml(text);
  return `<h${level}>${safeText}</h${level}>`;
}

function renderYearArchives(published, targetYears = null) {
  const template = fs.readFileSync(INDEX_TEMPLATE, 'utf8');
  const byYear = groupBy(published, (item) => item.year);
  const availableYears = Array.from(byYear.keys()).sort((a, b) => Number(b) - Number(a));
  const years = targetYears
    ? Array.from(targetYears).sort((a, b) => Number(b) - Number(a))
    : availableYears;

  if (targetYears) {
    for (const year of targetYears) {
      if (!byYear.has(year)) {
        removeDir(path.join(ARCHIVE_OUTPUT_ROOT, year));
      }
    }
  }

  for (const year of years) {
    if (!byYear.has(year)) {
      continue;
    }
    const yearItems = sortItems(byYear.get(year), 'date-asc');
    const byMonth = groupBy(yearItems, (item) => item.month);
    const months = Array.from(byMonth.keys()).sort((a, b) => Number(a) - Number(b));
    const queryResults = {};

    const monthSections = months.map((month) => {
      const monthItems = sortItems(byMonth.get(month), 'date-asc');
      const queryName = `year-${year}-month-${month}`;
      queryResults[queryName] = monthItems;

      const monthLabel = `${monthName(month)} ${year}`;
      const monthLink = `${ARCHIVE_ROOT_PATH}${year}/${month}/`;
      return [
        '<section class="archive-month">',
        `  <h2><a href="${monthLink}">${escapeHtml(monthLabel)}</a></h2>`,
        '  <ul class="summary-list">',
        `    <template data-query="${queryName}" data-view="summary-list">`,
        '      <li class="summary-empty">No posts yet.</li>',
        '    </template>',
        '  </ul>',
        '</section>'
      ].join('\n');
    }).join('\n');

    const content = monthSections || '<p class="summary-empty">No posts yet.</p>';
    const html = renderTemplate(
      applySlots(
        applyMeta(template, {
          canonical: joinUrl(SITE_URL, `${ARCHIVE_ROOT_PATH}${year}/`),
          description: SITE_DESCRIPTION,
          title: `${year} Archive`
        }),
        {
          'page-heading': buildHeading(year),
          'page-intro': '',
          'page-body': content,
          'page-extra': ''
        }
      ),
      queryResults
    );
    writeFile(path.join(ARCHIVE_OUTPUT_ROOT, year, 'index.html'), html);
  }
}

function renderMonthArchives(published, targetMonths = null) {
  const template = fs.readFileSync(INDEX_TEMPLATE, 'utf8');
  const byMonth = groupBy(published, (item) => `${item.year}-${item.month}`);
  const availableKeys = Array.from(byMonth.keys()).sort((a, b) => b.localeCompare(a));
  const keys = targetMonths
    ? Array.from(targetMonths).sort((a, b) => b.localeCompare(a))
    : availableKeys;

  if (targetMonths) {
    for (const key of targetMonths) {
      if (!byMonth.has(key)) {
        const [year, month] = key.split('-');
        removeDir(path.join(ARCHIVE_OUTPUT_ROOT, year, month));
      }
    }
  }

  for (const key of keys) {
    if (!byMonth.has(key)) {
      continue;
    }
    const [year, month] = key.split('-');
    const monthItems = sortItems(byMonth.get(key), 'date-asc');
    const label = `${monthName(month)} ${year}`;
    const pageBody = buildSummaryListSection('page-posts');
    const slots = {
      'page-heading': buildHeading(label),
      'page-intro': '',
      'page-body': pageBody,
      'page-extra': ''
    };
    const html = renderTemplate(
      applySlots(
      applyMeta(template, {
        canonical: joinUrl(SITE_URL, `${ARCHIVE_ROOT_PATH}${year}/${month}/`),
        description: SITE_DESCRIPTION,
        title: `${label} Archive`
      }),
        slots
      ),
      {
        'page-posts': monthItems
      }
    );
    writeFile(path.join(ARCHIVE_OUTPUT_ROOT, year, month, 'index.html'), html);
  }
}

function renderTagArchives(published, targetTags = null) {
  const template = fs.readFileSync(INDEX_TEMPLATE, 'utf8');
  const tagMap = new Map();

  for (const article of published) {
    const tags = article.frontmatter.tags || [];
    for (const rawTag of tags) {
      const tag = normalizeTag(rawTag);
      if (!tag) {
        continue;
      }
      if (!tagMap.has(tag)) {
        tagMap.set(tag, []);
      }
      tagMap.get(tag).push(article);
    }
  }

  const tags = targetTags ? Array.from(targetTags).sort() : Array.from(tagMap.keys()).sort();
  for (const tag of tags) {
    const items = tagMap.get(tag);
    if (!items) {
      removeDir(path.join(OUTPUT_DIR, 'tags', tag));
      continue;
    }
    removeDir(path.join(OUTPUT_DIR, 'tags', tag));
    const itemsDesc = sortItems(items, 'date-desc');
    const latest = itemsDesc.slice(0, 25);
    const yearCounts = countBy(items, (item) => item.year);
    const years = Object.keys(yearCounts).sort((a, b) => Number(b) - Number(a));

    const yearList = years.length
      ? [
        '<section class="tag-years">',
        '  <h2>Years</h2>',
        '  <ul class="tag-year-list">',
        years.map((year) => {
          const count = yearCounts[year];
          return `    <li><a href="/tags/${tag}/${year}/">${escapeHtml(year)}</a> (${count})</li>`;
        }).join('\n'),
        '  </ul>',
        '</section>'
      ].join('\n')
      : '';

    const pageBody = buildSummaryListSection('page-posts');
    const slots = {
      'page-heading': buildHeading(`Tag: ${tag}`),
      'page-intro': '',
      'page-body': pageBody,
      'page-extra': yearList
    };

    const html = renderTemplate(
      applySlots(
        applyMeta(template, {
          canonical: joinUrl(SITE_URL, `/tags/${tag}/`),
          description: SITE_DESCRIPTION,
          title: `Tag: ${tag}`
        }),
        slots
      ),
      {
        'page-posts': latest
      }
    );
    writeFile(path.join(OUTPUT_DIR, 'tags', tag, 'index.html'), html);

    for (const year of years) {
      const yearItems = items.filter((item) => item.year === year);
      const yearItemsDesc = sortItems(yearItems, 'date-desc');
      const yearBody = buildSummaryListSection('page-posts');
      const yearSlots = {
        'page-heading': buildHeading(`Tag: ${tag} - ${year}`),
        'page-intro': '',
        'page-body': yearBody,
        'page-extra': ''
      };
      const yearHtml = renderTemplate(
        applySlots(
          applyMeta(template, {
            canonical: joinUrl(SITE_URL, `/tags/${tag}/${year}/`),
            description: SITE_DESCRIPTION,
            title: `Tag: ${tag} - ${year}`
          }),
          yearSlots
        ),
        {
          'page-posts': yearItemsDesc
        }
      );
      writeFile(path.join(OUTPUT_DIR, 'tags', tag, year, 'index.html'), yearHtml);
    }
  }
}

function renderTagIndex(queryResults) {
  const template = fs.readFileSync(INDEX_TEMPLATE, 'utf8');
  const pageBody = buildTagListSection('all-published-posts');
  const html = renderTemplate(
    applySlots(
      applyMeta(template, {
        canonical: joinUrl(SITE_URL, '/tags/'),
        description: SITE_DESCRIPTION,
        title: 'Tags'
      }),
      {
        'page-heading': buildHeading('Tags'),
        'page-intro': '',
        'page-body': pageBody,
        'page-extra': ''
      }
    ),
    queryResults
  );
  writeFile(path.join(OUTPUT_DIR, 'tags', 'index.html'), html);
}

function renderSeriesArchives(published, targetSeries = null) {
  const template = fs.readFileSync(INDEX_TEMPLATE, 'utf8');
  const seriesMap = groupBy(published.filter((item) => item.frontmatter.series), (item) => item.frontmatter.series);
  const seriesNames = targetSeries
    ? Array.from(targetSeries).sort()
    : Array.from(seriesMap.keys()).sort();

  for (const series of seriesNames) {
    const seriesItems = seriesMap.get(series);
    if (!seriesItems) {
      removeDir(path.join(OUTPUT_DIR, 'series', series));
      continue;
    }
    removeDir(path.join(OUTPUT_DIR, 'series', series));
    const itemsDesc = sortItems(seriesItems, 'date-desc');
    const latest = itemsDesc.slice(0, 25);
    const latestAsc = sortItems(latest, 'date-asc');
    const yearCounts = countBy(seriesItems, (item) => item.year);
    const years = Object.keys(yearCounts).sort((a, b) => Number(b) - Number(a));

    const yearList = years.length
      ? [
        '<section class="tag-years">',
        '  <h2>Years</h2>',
        '  <ul class="tag-year-list">',
        years.map((year) => {
          const count = yearCounts[year];
          return `    <li><a href="/series/${series}/${year}/">${escapeHtml(year)}</a> (${count})</li>`;
        }).join('\n'),
        '  </ul>',
        '</section>'
      ].join('\n')
      : '';

    const pageBody = buildArticleListSection('page-posts');
    const slots = {
      'page-heading': buildHeading(`Series: ${series}`),
      'page-intro': '',
      'page-body': pageBody,
      'page-extra': yearList
    };

    const html = renderTemplate(
      applySlots(
        applyMeta(template, {
          canonical: joinUrl(SITE_URL, `/series/${series}/`),
          description: SITE_DESCRIPTION,
          title: `Series: ${series}`
        }),
        slots
      ),
      {
        'page-posts': latestAsc
      }
    );
    writeFile(path.join(OUTPUT_DIR, 'series', series, 'index.html'), html);

    for (const year of years) {
      const yearItems = seriesItems.filter((item) => item.year === year);
      const yearItemsAsc = sortItems(yearItems, 'date-asc');
      const yearBody = buildArticleListSection('page-posts');
      const yearSlots = {
        'page-heading': buildHeading(`Series: ${series} - ${year}`),
        'page-intro': '',
        'page-body': yearBody,
        'page-extra': yearList
      };
      const yearHtml = renderTemplate(
        applySlots(
          applyMeta(template, {
            canonical: joinUrl(SITE_URL, `/series/${series}/${year}/`),
            description: SITE_DESCRIPTION,
            title: `Series: ${series} - ${year}`
          }),
          yearSlots
        ),
        {
          'page-posts': yearItemsAsc
        }
      );
      writeFile(path.join(OUTPUT_DIR, 'series', series, year, 'index.html'), yearHtml);
    }
  }
}

function renderSeriesIndex(published) {
  const template = fs.readFileSync(INDEX_TEMPLATE, 'utf8');
  const seriesCounts = countBy(
    published.filter((item) => item.frontmatter.series),
    (item) => item.frontmatter.series
  );
  const seriesNames = Object.keys(seriesCounts).sort();

  const seriesList = seriesNames.length
    ? seriesNames.map((series) => {
      const count = seriesCounts[series] || 0;
      return `<li><a href="/series/${series}/">${escapeHtml(series)}</a> (${count})</li>`;
    }).join('\n')
    : '<li class="archive-empty">No series yet.</li>';

  const pageBody = `<ul class="index-list">\n${seriesList}\n</ul>`;
  const html = renderTemplate(
    applySlots(
      applyMeta(template, {
        canonical: joinUrl(SITE_URL, '/series/'),
        description: SITE_DESCRIPTION,
        title: 'Series'
      }),
      {
        'page-heading': buildHeading('Series'),
        'page-intro': '',
        'page-body': pageBody,
        'page-extra': ''
      }
    ),
    {}
  );
  writeFile(path.join(OUTPUT_DIR, 'series', 'index.html'), html);
}

function renderLintIndex(index) {
  if (!LINT_REPORTS_BY_PATH) {
    return;
  }
  const entries = collectLintEntries(index);
  const pageBody = entries.length
    ? buildLintIndexList(entries)
    : '<p class="summary-empty">No lint issues in this build.</p>';
  const intro = '<p class="summary-empty">Dev-only view of articles that fail lint. Fixing these makes the published output predictable.</p>';
  const template = fs.readFileSync(INDEX_TEMPLATE, 'utf8');
  const html = renderTemplate(
    applySlots(
      applyMeta(template, {
        canonical: joinUrl(SITE_URL, '/lint/'),
        description: 'Lint report for draft articles.',
        title: 'Lint report'
      }),
      {
        'page-heading': buildHeading('Lint report'),
        'page-intro': intro,
        'page-body': pageBody,
        'page-extra': ''
      }
    ),
    {}
  );
  writeFile(path.join(OUTPUT_DIR, 'lint', 'index.html'), html);
}

function collectLintEntries(index) {
  if (!LINT_REPORTS_BY_PATH) {
    return [];
  }
  const articleByPath = new Map(index.map((article) => [path.resolve(article.mdPath), article]));
  const items = [];
  for (const [filePath, report] of LINT_REPORTS_BY_PATH.entries()) {
    if (!report || !report.issues || report.issues.length === 0) {
      continue;
    }
    if (path.basename(filePath) !== 'article.md') {
      continue;
    }
    const article = articleByPath.get(filePath);
    if (!article) {
      continue;
    }
    items.push({ article, report });
  }
  const reportByPath = new Map(items.map((item) => [path.resolve(item.article.mdPath), item.report]));
  const sortedArticles = sortItems(items.map((item) => item.article), 'date-desc');
  return sortedArticles.map((article) => ({
    article,
    report: reportByPath.get(path.resolve(article.mdPath))
  }));
}

function buildLintIndexList(entries) {
  const items = entries.map(({ article, report }) => renderLintIndexItem(article, report)).join('\n');
  return `<ul class="lint-list">\n${items}\n</ul>`;
}

function renderLintIndexItem(article, report) {
  const title = article.frontmatter.title ? renderInline(article.frontmatter.title) : escapeHtml(article.slug);
  const dateText = formatDisplayDate(article);
  const counts = report.severityCounts || tallyLintSeverities(report.issues || []);
  const metaParts = [dateText];
  if (article.frontmatter.series) {
    metaParts.push(`Series: <a href="/series/${encodeURIComponent(article.frontmatter.series)}/">${escapeHtml(article.frontmatter.series)}</a>`);
  }
  metaParts.push(formatLintCounts(counts));
  const issueItems = buildLintIssueList(report.issues || []);
  return [
    '  <li class="lint-item">',
    `    <h2 class="lint-item-title"><a href="${article.publicPath}">${title}</a></h2>`,
    `    <p class="lint-item-meta">${metaParts.join(' | ')}</p>`,
    issueItems,
    '  </li>'
  ].join('\n');
}

function buildLintIssueList(issues) {
  if (!issues.length) {
    return '    <p class="lint-item-empty">No issues.</p>';
  }
  const limited = issues.slice(0, 5);
  const items = limited.map((issue) => {
    const lineLabel = issue.line ? `Line ${issue.line}` : 'Line n/a';
    return `      <li>${escapeHtml(lineLabel)}: ${escapeHtml(issue.message)}</li>`;
  });
  if (issues.length > 5) {
    items.push(`      <li>And ${issues.length - 5} more.</li>`);
  }
  return [
    '    <ul class="lint-item-issues">',
    ...items,
    '    </ul>'
  ].join('\n');
}

function formatLintCounts(counts) {
  const parts = [];
  if (counts.high) {
    parts.push(`${counts.high} high`);
  }
  if (counts.medium) {
    parts.push(`${counts.medium} medium`);
  }
  if (counts.low) {
    parts.push(`${counts.low} low`);
  }
  return parts.length ? parts.join(', ') : '0 issues';
}

function renderTemplate(html, queryResults) {
  const templateRegex = /<template\b([^>]*)>([\s\S]*?)<\/template>/g;

  const hydrated = applySiteHrefs(html);
  const rendered = hydrated.replace(templateRegex, (full, attrText, fallback) => {
    if (/<template\b/i.test(fallback)) {
      throw new Error('Nested <template> elements are not allowed');
    }

    const attrs = parseAttributes(attrText);
    const queryName = attrs['data-query'];
    if (!queryName) {
      throw new Error('Missing data-query attribute');
    }

    if (!queryResults[queryName] && !INTERNAL_QUERY_NAMES.has(queryName)) {
      throw new Error(`Unknown query '${queryName}'`);
    }

    const view = attrs['data-view'] || 'article';
    if (!['article', 'article-full', 'summary', 'summary-list', 'tag-list', 'article-meta-top', 'article-meta-bottom'].includes(view)) {
      throw new Error(`Unknown data-view '${view}'`);
    }
    const wrap = attrs['data-wrap'];
    if (wrap && wrap !== 'article') {
      throw new Error(`Unknown data-wrap '${wrap}'`);
    }
    if (wrap && view !== 'article') {
      throw new Error('data-wrap is only supported with data-view="article"');
    }

    const items = queryResults[queryName] || [];
    if (view === 'tag-list') {
      const tagList = renderTagList(items);
      if (!tagList) {
        return fallback;
      }
      return tagList;
    }
    if (view === 'article-meta-top' || view === 'article-meta-bottom') {
      if (!items.length) {
        return fallback;
      }
      const fragments = items.map((item) => {
        return view === 'article-meta-top'
          ? renderArticleMetaTop(item)
          : renderArticleMetaBottom(item);
      }).filter(Boolean);
      return fragments.join('\n');
    }
    if (!items.length) {
      return fallback;
    }

    const fragments = items.map((item) => {
      if (view === 'article') {
        const body = renderArticleBody(item);
        if (wrap === 'article') {
          return `<article class="article-entry">\n${body}\n</article>`;
        }
        return body;
      }
      if (view === 'article-full') {
        return renderFullArticle(item);
      }
      const summary = renderSummary(item);
      if (view === 'summary-list') {
        return `<li class="summary-item">${summary}</li>`;
      }
      return summary;
    });

    return fragments.join('\n');
  });

  if (/<template\b/i.test(rendered)) {
    throw new Error('Rendered output still contains <template> elements');
  }

  return applyBasePath(rendered);
}

function renderArticleBody(article) {
  const raw = fs.readFileSync(article.mdPath, 'utf8');
  const parsed = parseFrontmatter(raw);
  if (!parsed) {
    if (!SOFT_FAIL) {
      throw new Error(`Missing frontmatter in ${article.relDir}/article.md`);
    }
    recordBuildWarning(`Missing frontmatter in ${article.relDir}/article.md (rendering full file as body)`);
    return renderMarkdown(raw, article.publicPath);
  }
  return renderMarkdown(parsed.body, article.publicPath);
}

function renderArticleMetaTop(article) {
  const dateText = formatDisplayDate(article);
  const parts = [];
  if (article.frontmatter.series) {
    const seriesText = escapeHtml(article.frontmatter.series);
    parts.push(`  <p class="article-meta-date"><em><a href="${article.publicPath}">${dateText}</a></em> | Series: <a href="/series/${encodeURIComponent(article.frontmatter.series)}/">${seriesText}</a></p>`);
  } else {
    parts.push(`  <p class="article-meta-date"><em><a href="${article.publicPath}">${dateText}</a></em></p>`);
  }
  return parts.join('\n');
}

function renderArticleMetaBottom(article) {
  const tags = article.frontmatter.tags || [];
  if (!tags.length) {
    return '';
  }
  const tagLinks = tags.map((tag) => {
    const safeTag = escapeHtml(tag);
    const normalized = normalizeTag(tag);
    return `<a rel="tag" href="/tags/${normalized}/">${safeTag}</a>`;
  }).join(', ');
  return `<p class="article-meta-tags">Tags: ${tagLinks}</p>`;
}

function renderFullArticle(article) {
  const metaTop = renderArticleMetaTop(article);
  const metaBottom = renderArticleMetaBottom(article);
  const body = renderArticleBody(article);
  const parts = ['<article class="article-entry">'];
  if (metaTop) {
    parts.push('  <header class="article-meta article-meta-top">');
    parts.push(metaTop);
    parts.push('  </header>');
  }
  const lintBanner = renderLintBanner(article);
  if (lintBanner) {
    parts.push(lintBanner);
  }
  parts.push(body);
  if (metaBottom) {
    parts.push('  <footer class="article-meta article-meta-bottom">');
    parts.push(metaBottom);
    parts.push('  </footer>');
  }
  parts.push('</article>');
  return parts.join('\n');
}

function renderLintBanner(article) {
  if (!LINT_REPORTS_BY_PATH) {
    return '';
  }
  const report = LINT_REPORTS_BY_PATH.get(path.resolve(article.mdPath));
  const isDraft = article.frontmatter.status === 'draft';
  if ((!report || !report.issues || report.issues.length === 0) && !isDraft) {
    return '';
  }
  if (!report || !report.issues || report.issues.length === 0) {
    return [
      '  <div class="lint-banner" role="note" aria-label="Draft status">',
      '    <p class="lint-banner-title">Draft status: no lint issues</p>',
      '  </div>'
    ].join('\n');
  }
  const counts = report.severityCounts || tallyLintSeverities(report.issues);
  const summaryParts = [];
  if (counts.high) {
    summaryParts.push(`high ${counts.high}`);
  }
  if (counts.medium) {
    summaryParts.push(`medium ${counts.medium}`);
  }
  if (counts.low) {
    summaryParts.push(`low ${counts.low}`);
  }
  const summary = summaryParts.length ? summaryParts.join(', ') : `${report.issues.length} issues`;
  const items = report.issues.slice(0, 6).map((issue) => {
    const lineLabel = issue.line ? `Line ${issue.line}` : 'Line n/a';
    return `      <li>${escapeHtml(lineLabel)}: ${escapeHtml(issue.message)}</li>`;
  });
  if (report.issues.length > 6) {
    items.push(`      <li>And ${report.issues.length - 6} more.</li>`);
  }
  return [
    '  <div class="lint-banner" role="note" aria-label="Draft issues">',
    `    <p class="lint-banner-title">Draft issues: ${escapeHtml(summary)}</p>`,
    '    <ul class="lint-banner-list">',
    ...items,
    '    </ul>',
    '  </div>'
  ].join('\n');
}

function renderSummary(article) {
  const fm = article.frontmatter;
  let titleText = fm.title;
  if (!titleText) {
    if (!SOFT_FAIL) {
      throw new Error(`Summary view requires frontmatter title in ${article.relDir}/article.md`);
    }
    recordBuildWarning(`Missing frontmatter title in ${article.relDir}/article.md (using slug fallback)`);
    titleText = articleMetaTitle(article);
  }
  const titleHtml = renderInline(titleText);
  const summaryHtml = fm.summary ? renderInline(fm.summary) : null;
  const dateText = `${article.year}-${article.month}-${article.day}`;

  const parts = [];
  parts.push('<article class="summary">');
  parts.push('  <header class="summary-header">');
  parts.push(`    <h2 class="summary-title"><a href="${article.publicPath}">${titleHtml}</a></h2>`);
  parts.push('  </header>');

  const metaParts = [];
  metaParts.push(`<time datetime="${dateText}">${dateText}</time>`);
  if (fm.series) {
    const seriesText = escapeHtml(fm.series);
    metaParts.push(`Series: <a href="/series/${encodeURIComponent(fm.series)}/">${seriesText}</a>`);
  }
  const tags = fm.tags || [];
  if (tags.length) {
    const tagLinks = tags.map((tag) => {
      const safeTag = escapeHtml(tag);
      const normalized = normalizeTag(tag);
      return `<a rel="tag" href="/tags/${normalized}/">${safeTag}</a>`;
    }).join(', ');
    metaParts.push(`Tags: ${tagLinks}`);
  }
  parts.push(`  <p class="summary-meta-line">${metaParts.join(' | ')}</p>`);

  if (fm.thumbnail) {
    const thumbSrc = joinUrl(article.publicPath, fm.thumbnail);
    parts.push('  <figure class="summary-thumb">');
    parts.push(`    <img src="${thumbSrc}" alt="${escapeHtml(titleText)}" />`);
    parts.push('  </figure>');
  }

  if (summaryHtml) {
    parts.push(`  <p class="summary-text">${summaryHtml}</p>`);
  }

  parts.push('</article>');
  return parts.join('\n');
}

function renderTagList(items) {
  const counts = new Map();
  for (const article of items) {
    const tags = article.frontmatter.tags || [];
    for (const rawTag of tags) {
      const tag = normalizeTag(rawTag);
      if (!tag) {
        continue;
      }
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  const tags = Array.from(counts.keys()).sort();
  if (!tags.length) {
    return '';
  }
  return tags.map((tag) => {
    const count = counts.get(tag);
    return `<li><a href="/tags/${tag}/">${escapeHtml(tag)}</a> (${count})</li>`;
  }).join('\n');
}

function applySlots(html, slots) {
  if (!slots || typeof slots !== 'object') {
    return html;
  }
  return html.replace(
    /(<([a-zA-Z0-9:-]+)(?:\s[^>]*?)?\sdata-slot="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,
    (full, openTag, tagName, slotName, inner, closeTag) => {
      if (!Object.prototype.hasOwnProperty.call(slots, slotName)) {
        return full;
      }
      return `${openTag}${slots[slotName]}${closeTag}`;
    }
  );
}

function applyHrefAttributes(html, values) {
  let output = html;
  for (const [key, value] of Object.entries(values)) {
    const marker = `data-href="${key}"`;
    output = output.split(marker).join(`href="${escapeHtml(value)}"`);
  }
  return output;
}

function composePageTitle(label) {
  return `${label} - ${SITE_NAME}`;
}

function articleMetaTitle(article) {
  const title = article.frontmatter.title || article.slug || 'Untitled';
  return stripInlineMarkup(title);
}

function articlePublishedTime(article) {
  const date = new Date(Date.UTC(Number(article.year), Number(article.month) - 1, Number(article.day)));
  return date.toISOString();
}

function siteImageUrl() {
  return joinUrl(SITE_URL, '/assets/example-favicon.png');
}

function articleOgImage(article) {
  const thumb = article.frontmatter.thumbnail;
  if (thumb) {
    return joinUrl(SITE_URL, joinUrl(article.publicPath, thumb));
  }
  return siteImageUrl();
}

function renderHeadMeta(config, values, tags) {
  const entries = config.map((item) => renderHeadMetaEntry(item, values)).filter(Boolean);
  if (tags && tags.length) {
    entries.push(...tags.map((tag) => {
      return `<meta property="article:tag" content="${escapeHtml(tag)}" />`;
    }));
  }
  return entries.length ? `${entries.join('\n')}\n` : '';
}

function renderHeadMetaEntry(item, values) {
  if (!item || !item.tag) {
    return '';
  }
  const tagName = item.tag;
  const valueKey = item.valueKey;
  const valueAttr = item.valueAttr || (tagName === 'title' ? 'text' : (tagName === 'link' ? 'href' : 'content'));
  const attrs = { ...(item.attrs || {}) };
  const value = valueKey ? values[valueKey] : null;

  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (item.titleKey) {
    const titleValue = values[item.titleKey];
    if (titleValue) {
      attrs.title = titleValue;
    }
  }

  if (valueAttr !== 'text') {
    attrs[valueAttr] = value;
  }

  const attrList = Object.entries(attrs)
    .map(([key, val]) => ` ${key}="${escapeHtml(val)}"`)
    .join('');

  if (valueAttr === 'text') {
    return `<${tagName}${attrList}>${escapeHtml(value)}</${tagName}>`;
  }
  return `<${tagName}${attrList} />`;
}

function applyMeta(html, {
  canonical,
  description,
  title,
  ogType,
  image,
  publishedTime,
  section,
  tags
}) {
  const metaTitle = title || SITE_NAME;
  const metaDescription = description ? normalizeWhitespace(description) : null;
  const metaImage = image || siteImageUrl();
  const metaOgType = ogType || 'website';
  const metaCanonical = canonical || SITE_URL;
  const twitterCard = metaImage ? 'summary_large_image' : 'summary';

  const metaValues = {
    'meta-description': metaDescription,
    'og-site-name': SITE_NAME,
    'og-title': metaTitle,
    'og-description': metaDescription,
    'og-url': metaCanonical,
    'og-type': metaOgType,
    'og-image': metaImage,
    'twitter-card': twitterCard,
    'twitter-title': metaTitle,
    'twitter-description': metaDescription,
    'twitter-image': metaImage,
    'article-published-time': publishedTime || null,
    'article-section': section || null,
    'color-scheme': META_COLOR_SCHEME,
    'theme-color': META_THEME_COLOR,
    'canonical-url': metaCanonical,
    'feed-url': joinUrl(SITE_URL, '/feed.xml'),
    'site-name': SITE_NAME,
    'page-title': metaTitle
  };
  const headMarkup = renderHeadMeta(META_CONFIG, metaValues, tags);
  return html.replace('<!-- meta:head -->', headMarkup);
}

function descriptionForArticle(article) {
  const summary = article.frontmatter.summary;
  if (summary) {
    const cleaned = stripInlineMarkup(summary);
    if (cleaned) {
      return cleaned;
    }
  }
  return null;
}

function stripInlineMarkup(text) {
  return normalizeWhitespace(String(text)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`~]/g, ''));
}

function normalizeWhitespace(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(item);
  }
  return map;
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function sortItems(items, sort) {
  return items.slice().sort(makeSortFn(sort));
}

function monthName(month) {
  const index = Number(month) - 1;
  return MONTH_NAMES[index] || month;
}

function renderMarkdown(body, basePath = '') {
  const lines = body.split(/\r?\n/);
  const foldIndex = lines.findIndex((line) => line.trim().match(/^@@Fold(?:\s*:\s*(.+))?$/));
  if (foldIndex === -1) {
    return renderMarkdownSection(lines, basePath).trim();
  }

  const foldLine = lines[foldIndex].trim();
  const foldMatch = foldLine.match(/^@@Fold(?:\s*:\s*(.+))?$/);
  const summaryText = foldMatch && foldMatch[1] ? foldMatch[1].trim() : 'Read more';
  const beforeLines = lines.slice(0, foldIndex);
  const afterLines = lines.slice(foldIndex + 1);
  const beforeHtml = renderMarkdownSection(beforeLines, basePath);
  const afterHtml = renderMarkdownSection(afterLines, basePath);
  return `${beforeHtml}<details class="article-fold"><summary>${renderInline(summaryText)}</summary>\n${afterHtml}</details>\n`.trim();
}

function renderMarkdownSection(lines, basePath) {
  let html = '';
  let paragraph = [];
  let inCode = false;
  let codeLang = '';
  let codeLines = [];
  let pendingCodeBlock = null;

  function flushParagraph() {
    if (!paragraph.length) {
      return;
    }
    const text = paragraph.join(' ').trim();
    if (!text) {
      paragraph = [];
      return;
    }
    const imageMatch = text.match(/^!\[([^\]]*)\]\((\S+)(?:\s+"([^"]+)")?\)$/);
    if (imageMatch) {
      const altText = escapeHtml(imageMatch[1]);
      const rawSrc = imageMatch[2];
      const resolvedSrc = resolveAssetPath(rawSrc, basePath);
      const src = escapeHtml(resolvedSrc);
      const title = imageMatch[3] ? escapeHtml(imageMatch[3]) : '';
      html += '<figure class="article-figure">';
      html += `<img src="${src}" alt="${altText}" />`;
      if (title) {
        html += `<figcaption>${title}</figcaption>`;
      }
      html += '</figure>\n';
      paragraph = [];
      return;
    }
    html += `<p>${renderInline(text)}</p>\n`;
    paragraph = [];
  }

  function flushCode() {
    const code = escapeHtml(codeLines.join('\n'));
    const classAttr = codeLang ? ` class="language-${codeLang}"` : '';
    const blockHtml = `<pre><code${classAttr}>${code}</code></pre>\n`;
    if (pendingCodeBlock) {
      html += pendingCodeBlock;
    }
    pendingCodeBlock = blockHtml;
    codeLines = [];
    codeLang = '';
  }

  for (const line of lines) {
    const trimmed = line.trim();

    const captionMatch = pendingCodeBlock ? trimmed.match(/^@@Caption:\s*(.+)$/) : null;
    if (captionMatch) {
      flushParagraph();
      const captionText = captionMatch[1].trim();
      const captionHtml = renderInline(captionText);
      html += `<figure class="listing">\n${pendingCodeBlock}<figcaption>${captionHtml}</figcaption>\n</figure>\n`;
      pendingCodeBlock = null;
      continue;
    }

    if (pendingCodeBlock && trimmed) {
      html += pendingCodeBlock;
      pendingCodeBlock = null;
    }

    if (trimmed.startsWith('```')) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushParagraph();
        inCode = true;
        codeLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      html += `<h${level}>${renderInline(text)}</h${level}>\n`;
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    paragraph.push(trimmed);
  }

  if (inCode) {
    flushCode();
  }

  if (pendingCodeBlock) {
    html += pendingCodeBlock;
    pendingCodeBlock = null;
  }

  flushParagraph();
  return html;
}

function resolveAssetPath(src, basePath) {
  if (!src) {
    return src;
  }
  if (/^(https?:)?\/\//i.test(src) || src.startsWith('/')) {
    return src;
  }
  const cleanedSrc = src.replace(/^\.\//, '');
  if (basePath) {
    return joinUrl(basePath, cleanedSrc).replace(/\/\.\//g, '/');
  }
  return cleanedSrc;
}

function parseFrontmatter(raw) {
  const lines = raw.split(/\r?\n/);
  if (!lines.length || lines[0].trim() !== '---') {
    return null;
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return null;
  }

  const frontmatterLines = lines.slice(1, endIndex);
  const body = lines.slice(endIndex + 1).join('\n');

  const frontmatter = parseFrontmatterLines(frontmatterLines);
  return { frontmatter, body };
}

function parseFrontmatterLines(lines) {
  const data = {};
  let currentKey = null;

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const commentMatch = line.trim().startsWith('#');
    if (commentMatch) {
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      const rawValue = keyMatch[2];

      if (!rawValue) {
        data[currentKey] = [];
        continue;
      }

      if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
        const items = rawValue.slice(1, -1).split(',').map((item) => item.trim()).filter(Boolean);
        data[currentKey] = items.map(stripQuotes);
      } else {
        data[currentKey] = stripQuotes(rawValue.trim());
      }

      continue;
    }

    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(data[currentKey])) {
        data[currentKey] = [];
      }
      data[currentKey].push(stripQuotes(listMatch[1].trim()));
    }
  }

  return data;
}

function stripQuotes(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function renderInline(text) {
  let escaped = escapeHtml(text);
  escaped = escaped.replace(/&lt;br\s*\/?&gt;/gi, '<br />');
  escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  escaped = escaped.replace(/_([^_]+)_/g, '<em>$1</em>');
  return linkifyTags(escaped);
}

function normalizeTag(tag) {
  return String(tag || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, '');
}

function linkifyTags(html) {
  const parts = html.split(/(<[^>]+>)/g);
  const tagPattern = /(^|[\s(>])#([A-Za-z0-9_-]+)\b/g;
  return parts.map((part) => {
    if (part.startsWith('<')) {
      return part;
    }
    return part.replace(tagPattern, (match, prefix, rawTag) => {
      const normalized = normalizeTag(rawTag);
      if (!normalized) {
        return match;
      }
      return `${prefix}<a rel="tag" href="/tags/${normalized}/">#${rawTag}</a>`;
    });
  }).join('');
}

function validateQueryField(query, name, errors, field) {
  const value = query[field];
  if (value === undefined) {
    return;
  }

  if (typeof value === 'object') {
    const from = value.from;
    const to = value.to;
    if (from === undefined || to === undefined) {
      errors.push(`Query '${name}' range for ${field} must include from/to`);
      return;
    }
    if (!isNumeric(from) || !isNumeric(to)) {
      errors.push(`Query '${name}' range for ${field} must be numeric`);
      return;
    }
    if (Number(from) > Number(to)) {
      errors.push(`Query '${name}' range for ${field} must be ordered`);
    }
    return;
  }

  if (!isNumeric(value)) {
    errors.push(`Query '${name}' has invalid ${field}`);
  }
}

function applyEqualityOrRange(items, query, field) {
  const value = query[field];
  if (value === undefined) {
    return items;
  }

  const key = field + 'Num';
  if (typeof value === 'object') {
    const from = Number(value.from);
    const to = Number(value.to);
    return items.filter((item) => item[key] >= from && item[key] <= to);
  }

  const target = Number(value);
  return items.filter((item) => item[key] === target);
}

function makeSortFn(sort) {
  return (a, b) => {
    let delta = 0;

    if (sort.startsWith('date')) {
      const dateA = a.yearNum * 10000 + a.monthNum * 100 + a.dayNum;
      const dateB = b.yearNum * 10000 + b.monthNum * 100 + b.dayNum;
      delta = dateA - dateB;
      if (delta === 0) {
        delta = a.ordinalNum - b.ordinalNum;
      }
    } else if (sort.startsWith('ordinal')) {
      delta = a.ordinalNum - b.ordinalNum;
    }

    if (sort.endsWith('desc')) {
      delta *= -1;
    }

    if (delta !== 0) {
      return delta;
    }

    return a.relDir.localeCompare(b.relDir);
  };
}

function listDirs(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function parseAttributes(attrText) {
  const attrs = {};
  const regex = /([A-Za-z0-9:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = regex.exec(attrText)) !== null) {
    attrs[match[1]] = match[3] || match[4] || '';
  }
  return attrs;
}

function cleanDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, contents) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, contents);
}

function copyDir(source, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(source, { withFileTypes: true });
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

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyAttributePlaceholders(html, values) {
  let output = html;
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }
    const safeValue = escapeHtml(value);
    const pattern = new RegExp(`\\sdata-attr-([a-zA-Z0-9:-]+)="${escapeRegExp(key)}"`, 'g');
    output = output.replace(pattern, (match, attr) => ` ${attr}="${safeValue}"`);
  }
  return output;
}

function isNumeric(value) {
  return value !== '' && value !== null && value !== undefined && !Number.isNaN(Number(value));
}

function joinUrl(base, relative) {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedRel = String(relative).replace(/^\/+/, '');
  return `${normalizedBase}${normalizedRel}`;
}

function toPosix(pth) {
  return pth.split(path.sep).join('/');
}

if (require.main === module) {
  main();
}
