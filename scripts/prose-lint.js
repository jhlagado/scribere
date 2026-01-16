#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DEFAULT_ROOT = resolveInstanceRoot(ROOT);

const BASE_THRESHOLDS = {
  high: 1,
  medium: 3,
  low: 6
};

const FLAGS_WITH_VALUES = new Set(['--max-high', '--max-medium', '--max-low', '--report-path', '--report-json']);

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

function loadProseLintConfig(filePath, defaults) {
  if (!fs.existsSync(filePath)) {
    return normalizeProseLintConfig(defaults, filePath);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Prose lint config must be a JSON object: ${filePath}`);
  }
  const merged = mergeConfig(defaults, parsed);
  return normalizeProseLintConfig(merged, filePath);
}

function mergeConfig(base, override) {
  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (Array.isArray(value)) {
      merged[key] = value;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = { ...(base[key] || {}), ...value };
    } else if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

function normalizeProseLintConfig(config, filePath) {
  const thresholds = config.thresholds || {};
  const metrics = config.metrics || {};
  const normalized = {
    thresholds: {
      high: normalizeNumber(thresholds.high, BASE_THRESHOLDS.high, filePath, 'thresholds.high'),
      medium: normalizeNumber(thresholds.medium, BASE_THRESHOLDS.medium, filePath, 'thresholds.medium'),
      low: normalizeNumber(thresholds.low, BASE_THRESHOLDS.low, filePath, 'thresholds.low')
    },
    metrics: {
      contrastParagraphCap: normalizeNumber(metrics.contrastParagraphCap, BASE_METRICS.contrastParagraphCap, filePath, 'metrics.contrastParagraphCap'),
      emdashLinesPer: normalizeNumber(metrics.emdashLinesPer, BASE_METRICS.emdashLinesPer, filePath, 'metrics.emdashLinesPer'),
      shortSentenceMax: normalizeNumber(metrics.shortSentenceMax, BASE_METRICS.shortSentenceMax, filePath, 'metrics.shortSentenceMax')
    },
    discourseMarkers: Array.isArray(config.discourseMarkers) ? config.discourseMarkers.filter(Boolean) : [],
    weakVerbs: Array.isArray(config.weakVerbs) ? config.weakVerbs.filter(Boolean) : [],
    rules: compileRules(Array.isArray(config.rules) ? config.rules : [], filePath),
    contrastPatterns: compileContrastPatterns(Array.isArray(config.contrastPatterns) ? config.contrastPatterns : [], filePath),
    punctuationRules: compilePunctuationRules(Array.isArray(config.punctuationRules) ? config.punctuationRules : [], filePath)
  };
  return normalized;
}

function normalizeNumber(value, fallback, filePath, label) {
  if (Number.isFinite(value)) {
    return value;
  }
  if (value === undefined || value === null) {
    return fallback;
  }
  throw new Error(`Invalid prose lint config value for ${label} in ${filePath}`);
}

function compileRules(rules, filePath) {
  return rules
    .filter((rule) => rule && rule.enabled !== false)
    .map((rule) => {
      const patterns = compilePatternList(rule.patterns || [], filePath, `rule ${rule.name || 'unnamed'}`);
      return {
        ...rule,
        patterns,
        paragraphStart: Boolean(rule.paragraphStart),
        skipInlineCode: Boolean(rule.skipInlineCode),
        docs: Boolean(rule.docs)
      };
    });
}

function compileContrastPatterns(patterns, filePath) {
  return patterns
    .filter((pattern) => pattern && pattern.enabled !== false)
    .map((pattern) => {
      const regex = compilePattern(pattern.pattern || pattern.regex || pattern, filePath, `contrast pattern ${pattern.label || 'unnamed'}`);
      return {
        ...pattern,
        regex
      };
    });
}

function compilePunctuationRules(rules, filePath) {
  return rules
    .filter((rule) => rule && rule.enabled !== false)
    .map((rule) => {
      const regex = compilePattern(rule.pattern || rule.regex || rule, filePath, `punctuation rule ${rule.label || 'unnamed'}`);
      return {
        ...rule,
        regex
      };
    });
}

function compilePatternList(patterns, filePath, context) {
  return patterns.map((pattern) => compilePattern(pattern, filePath, context)).filter(Boolean);
}

function compilePattern(pattern, filePath, context) {
  if (!pattern) {
    return null;
  }
  if (pattern instanceof RegExp) {
    return pattern;
  }
  if (typeof pattern === 'string') {
    return new RegExp(pattern);
  }
  if (pattern.regex instanceof RegExp) {
    return pattern.regex;
  }
  if (typeof pattern.regex === 'string') {
    return new RegExp(pattern.regex, pattern.flags || '');
  }
  if (typeof pattern.pattern === 'string') {
    return new RegExp(pattern.pattern, pattern.flags || '');
  }
  throw new Error(`Invalid prose lint pattern in ${filePath} (${context})`);
}

const BASE_RULES = [
  {
    name: 'ai-writing-blacklist',
    weight: 10,
    patterns: [
      // Pivotal/Transformative
      /\bpivotal\b/i,
      /\bgame-changer\b/i,
      /\bempower(?:s|ed|ing)?\b/i,
      /\brevolutionary\b/i,
      /\bunlock(?:s|ed|ing)?\b/i,
      /\bunleash(?:es|ed|ing)?\b/i,
      /\brevolutioniz(?:e|es|ed|ing)\b/i,
      /\blandscape\b/i,
      
      // Exploring/Navigating
      /\bdelve\b/i,
      /\bdive into\b/i,
      /\bnavigate the complexities\b/i,
      /\bembark on a journey\b/i,
      
      // Optimization/Efficiency
      /\bstreamline\b/i,
      /\bsynergize\b/i,
      /\bmaximize\b/i,
      /\bleverage\b/i,
      /\btap into\b/i,
      
      // Vague Value
      /\bcomprehensive\b/i,
      /\brobust\b/i,
      /\bbespoke\b/i,
      /\bseamless transition\b/i,
      /\bvibrant\b/i,
      
      // Summary Crutches
      /\bin today's fast-paced world\b/i,
      /\bin conclusion\b/i,
      /\blooking ahead\b/i,
      /\btestament\b/i
    ],
    message: 'Forbidden AI-ism (see docs/authoring.md)'
  },
  {
    name: 'banned-phrase',
    weight: 5,
    patterns: [
      /\bin short\b/i,
      /\bin summary\b/i,
      /\bin the age of\b/i,
      /\bin an age of\b/i,
      /\bin the era of\b/i,
      /\bin an era of\b/i,
      /\bat the end of the day\b/i,
      /\bthe key takeaway\b/i,
      /\bultimately\b/i,
      /\bin a nutshell\b/i,
      /\bwhat this means is\b/i,
      /\bit's worth noting\b/i,
      /\bat its core\b/i,
      /\bthis highlights the importance of\b/i,
      /\byour terms\b/i,
      /\bhonest\b/i
    ],
    message: 'Banned phrase'
  },
  {
    name: 'first-person-plural',
    weight: 3,
    patterns: [
      /\bwe\b/i,
      /\bour\b/i,
      /\bours\b/i,
      /\bus\b/i,
      /\bourselves\b/i
    ],
    message: 'First-person plural pronoun (prefer "I")'
  },
  {
    name: 'scene-setting',
    weight: 4,
    patterns: [
      /^(this|in this)\s+(post|article|section)\b/i
    ],
    message: 'Scene-setting opener',
    paragraphStart: true
  },
  {
    name: 'weak-opener',
    weight: 2,
    patterns: [
      /^I\s+(want|think|feel|am)\b/i,
      /^There\s+(is|are)\b/i,
      /^It\s+(is|was|are|were|['’]s)\b/i
    ],
    message: 'Weak or vague paragraph opener',
    paragraphStart: true
  },
  {
    name: 'conjunction-opener',
    weight: 2,
    patterns: [
      /^(And|But)\b/
    ],
    message: 'Conjunction paragraph opener (prefer to join the previous sentence)',
    paragraphStart: true
  },
  {
    name: 'hedge-words',
    weight: 2,
    patterns: [
      /\bkind of\b/i,
      /\bsort of\b/i,
      /\bmaybe\b/i,
      /\bprobably\b/i,
      /\bgenerally\b/i,
      /\bsomewhat\b/i
    ],
    message: 'Hedge word'
  },
  {
    name: 'intensifiers',
    weight: 2,
    patterns: [
      /\bvery\b/i,
      /\breally\b/i,
      /\bquite\b/i,
      /\bpretty\b/i,
      /\bextremely\b/i,
      /\bhighly\b/i
    ],
    message: 'Empty intensifier'
  },
  {
    name: 'placeholder-nouns',
    weight: 2,
    patterns: [
      /\bthing\b/i,
      /\bthings\b/i,
      /\bstuff\b/i,
      /\baspect\b/i,
      /\baspects\b/i,
      /\belement\b/i,
      /\belements\b/i,
      /\barea\b/i,
      /\bareas\b/i,
      /\bpart\b/i,
      /\bparts\b/i
    ],
    message: 'Placeholder noun'
  },
  {
    name: 'passive-voice',
    weight: 3,
    patterns: [
      /\b(am|is|are|was|were|be|been|being)\b\s+\w+ed\b/i
    ],
    message: 'Possible passive voice'
  },
  {
    name: 'us-spelling',
    weight: 5,
    patterns: [
      /\bcolor\b/i,
      /\bcolors\b/i,
      /\bcenter\b/i,
      /\bcenters\b/i,
      /\bcentered\b/i,
      /\bcentering\b/i,
      /\borganize\b/i,
      /\borganizes\b/i,
      /\borganized\b/i,
      /\borganizing\b/i,
      /\banalyze\b/i,
      /\banalyzed\b/i,
      /\banalyzing\b/i,
      /\boptimization\b/i,
      /\boptimize\b/i,
      /\boptimized\b/i,
      /\boptimizing\b/i,
      /\bbehavior\b/i,
      /\bbehaviors\b/i,
      /\bstabilize\b/i,
      /\bstabilized\b/i,
      /\bstabilizes\b/i,
      /\bstabilizing\b/i,
      /\bminimize\b/i,
      /\bminimized\b/i,
      /\bminimizes\b/i,
      /\bminimizing\b/i,
      /\bcustomize\b/i,
      /\bcustomized\b/i,
      /\bcustomizes\b/i,
      /\bcustomizing\b/i,
      /\bprioritize\b/i,
      /\bprioritized\b/i,
      /\bprioritizes\b/i,
      /\bprioritizing\b/i,
      /\bsummarize\b/i,
      /\bsummarized\b/i,
      /\bsummarizes\b/i,
      /\bsummarizing\b/i,
      /\bvisualize\b/i,
      /\bvisualized\b/i,
      /\bvisualizes\b/i,
      /\bvisualizing\b/i,
      /\bcatalog\b/i,
      /\bcatalogs\b/i,
      /\bgray\b/i,
      /\bhonor\b/i,
      /\bhonors\b/i,
      /\bhonored\b/i,
      /\bhonoring\b/i,
      /\bmeter\b/i,
      /\bmeters\b/i,
      /\bfiber\b/i,
      /\bdefense\b/i,
      /\boffense\b/i,
      /\bapologize\b/i,
      /\bapologized\b/i,
      /\bapologizes\b/i,
      /\bapologizing\b/i
    ],
    message: 'US spelling (use British/Australian)',
    skipInlineCode: true,
    docs: true
  }
];

const BASE_CONTRAST_PATTERNS = [
  {
    label: 'not X. it is Y',
    weight: 8,
    regex: /\bnot\b[^.?!]{0,160}[.?!]\s+(it|this)\s+(is|'s)\b/gi
  },
  {
    label: "isn't X. it's Y",
    weight: 6,
    regex: /\bisn['’]t\b[^.?!]{0,160}[.?!]\s+it(?:'s|’s| is)\b/gi
  },
  {
    label: "goal isn't X. it's Y",
    weight: 8,
    regex: /\b(goal|aim|purpose|point|intent)\b[^.?!]{0,80}\bisn['’]t\b[^.?!]{0,160}[.?!]\s+it(?:'s|’s| is)\b/gi
  },
  {
    label: 'is/are not X. it/they <verb>',
    weight: 8,
    regex: /\b(?:is|are|was|were)\s+not\b[^.?!]{0,200}[.?!]\s+(?:it|this|they|these|that|those)\s+(?!do\s+not|does\s+not|did\s+not|is\s+not|are\s+not|was\s+not|were\s+not)\b\w+/gi
  },
  {
    label: 'do/does not X. it/they <verb>',
    weight: 8,
    regex: /\b(?:do|does|did)\s+not\b[^.?!]{0,200}[.?!]\s+(?:it|this|they|these|that|those)\s+(?!do\s+not|does\s+not|did\s+not|is\s+not|are\s+not|was\s+not|were\s+not)\b\w+/gi
  },
  {
    label: 'not X, but Y',
    weight: 6,
    regex: /\bnot\b[^.?!]{0,100}\bbut\b/gi
  },
  {
    label: 'not only X but Y',
    weight: 6,
    regex: /\bnot only\b[^.?!]{0,120}\bbut\b/gi
  },
  {
    label: 'not because',
    weight: 12,
    regex: /\bnot because\b[^.?!]{0,200}[.?!]/gi
  },
  {
    label: 'rather than',
    weight: 4,
    regex: /\brather than\b/gi
  },
  {
    label: 'instead of',
    weight: 4,
    regex: /\binstead of\b/gi
  },
  {
    label: 'not about',
    weight: 3,
    regex: /\b(it is|it's|this is)\s+not\s+about\b/gi
  },
  {
    label: 'not a/an',
    weight: 3,
    regex: /\b(it is|it's|this is)\s+not\s+(a|an)\b/gi
  }
];

const BASE_METRICS = {
  contrastParagraphCap: 12,
  emdashLinesPer: 20,
  shortSentenceMax: 6
};
const EMDASH_PATTERN = /—/g;
const BASE_PUNCTUATION_RULES = [
  {
    label: 'ellipsis',
    weight: 2,
    regex: /\.{3,}|…/g,
    message: 'Ellipsis'
  },
  {
    label: 'question-mark',
    weight: 2,
    regex: /\?/g,
    message: 'Question mark in narrative prose'
  },
  {
    label: 'multiple-exclamation',
    weight: 2,
    regex: /!{2,}/g,
    message: 'Multiple exclamation points'
  },
  {
    label: 'interrobang',
    weight: 2,
    regex: /\?!|!\?/g,
    message: 'Interrobang'
  }
];

const BASE_DISCOURSE_MARKERS = [
  'however',
  'therefore',
  'moreover',
  'overall',
  'in addition',
  'in fact',
  'as a result',
  'in other words',
  'on the other hand'
];

const BASE_WEAK_VERBS = [
  'do',
  'does',
  'did',
  'make',
  'makes',
  'made',
  'get',
  'gets',
  'got',
  'have',
  'has',
  'had',
  'use',
  'uses',
  'used'
];

const PROSE_LINT_CONFIG_PATH = path.join(ROOT, 'config', 'prose-lint.json');
const PROSE_LINT_CONFIG = loadProseLintConfig(PROSE_LINT_CONFIG_PATH, {
  thresholds: BASE_THRESHOLDS,
  metrics: BASE_METRICS,
  rules: BASE_RULES,
  contrastPatterns: BASE_CONTRAST_PATTERNS,
  punctuationRules: BASE_PUNCTUATION_RULES,
  discourseMarkers: BASE_DISCOURSE_MARKERS,
  weakVerbs: BASE_WEAK_VERBS
});

const DEFAULT_THRESHOLDS = { ...PROSE_LINT_CONFIG.thresholds };
const CONTRAST_PARAGRAPH_CAP = PROSE_LINT_CONFIG.metrics.contrastParagraphCap;
const EMDASH_LINES_PER = PROSE_LINT_CONFIG.metrics.emdashLinesPer;
const SHORT_SENTENCE_MAX = PROSE_LINT_CONFIG.metrics.shortSentenceMax;
const RULES = PROSE_LINT_CONFIG.rules;
const CONTRAST_PATTERNS = PROSE_LINT_CONFIG.contrastPatterns;
const PUNCTUATION_RULES = PROSE_LINT_CONFIG.punctuationRules;
const DISCOURSE_MARKERS = PROSE_LINT_CONFIG.discourseMarkers;
const WEAK_VERBS = PROSE_LINT_CONFIG.weakVerbs;

const args = process.argv.slice(2);
const includePublished = args.includes('--all') || args.includes('--include-published');
const strict = args.includes('--strict');
const gate = args.includes('--gate') || args.includes('--ci');
const includeDocs = args.includes('--docs') || args.includes('--all');
const reportPath = resolveReportPath(args);
const thresholds = resolveThresholds(args);
const targets = extractTargets(args);

function main() {
  const defaultTargets = targets.length ? targets : [DEFAULT_ROOT];
  if (includeDocs && !targets.length) {
    defaultTargets.push(path.join(ROOT, 'docs'));
    defaultTargets.push(path.join(ROOT, 'README.md'));
    defaultTargets.push(path.join(ROOT, 'notes.md'));
  }
  const files = resolveTargets(defaultTargets, { includeDocs });

  if (!files.length) {
    return;
  }

  let checked = 0;
  let skipped = 0;
  let totalIssues = 0;
  let totalScore = 0;
  const reports = [];

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = parseFrontmatter(raw);
    const isArticle = path.basename(filePath) === 'article.md';
    if (!parsed && isArticle) {
      reports.push({
        filePath,
        status: 'unknown',
        score: 5,
        severityCounts: { high: 1, medium: 0, low: 0 },
        issues: [
          {
            line: 1,
            weight: 5,
            severity: 'high',
            message: 'Missing frontmatter'
          }
        ]
      });
      checked += 1;
      totalIssues += 1;
      totalScore += 5;
      continue;
    }

    const normalized = parsed || {
      frontmatter: {},
      frontmatterLines: {},
      body: raw,
      bodyStartLine: 1
    };
    const status = isArticle ? (normalized.frontmatter.status || 'unknown') : 'doc';
    if (!includePublished && status === 'published') {
      skipped += 1;
      continue;
    }

    checked += 1;
    const result = lintDocument(filePath, normalized, { isArticle });
    totalIssues += result.issues.length;
    totalScore += result.score;
    reports.push(result);
  }

  if (!reports.length) {
    return;
  }

  if (reportPath) {
    writeReport(reportPath, {
      checked,
      skipped,
      totalIssues,
      totalScore,
      reports
    });
  }

  let totalHigh = 0;
  let totalMedium = 0;
  let totalLow = 0;
  let warningFiles = 0;
  let errorFiles = 0;
  const gateEnabled = gate && !strict;

  for (const report of reports) {
    if (!report.severityCounts) {
      report.severityCounts = tallySeverities(report.issues);
    }
    const { high, medium, low } = report.severityCounts;
    totalHigh += high;
    totalMedium += medium;
    totalLow += low;

    report.thresholdStatus = gateEnabled
      ? evaluateThresholds(report.severityCounts, thresholds)
      : report.issues.length
        ? { status: 'warn', reasons: [] }
        : { status: 'pass', reasons: [] };

    if (gateEnabled) {
      if (report.thresholdStatus.status === 'error') {
        errorFiles += 1;
      } else if (report.thresholdStatus.status === 'warn') {
        warningFiles += 1;
      }
    }
  }

  if (totalIssues === 0) {
    return;
  }

  for (const report of reports) {
    if (!report.issues.length) {
      continue;
    }
    console.log(`${report.filePath}`);
    console.log(`Score: ${report.score}`);
    for (const issue of report.issues) {
      const lineInfo = issue.line ? `:${issue.line}` : '';
      const severityTag = issue.severity ? ` [${issue.severity}]` : '';
      console.log(`- ${report.filePath}${lineInfo}${severityTag} ${issue.message}`);
    }
    console.log(`Severity: high ${report.severityCounts.high} | medium ${report.severityCounts.medium} | low ${report.severityCounts.low}`);
    if (gateEnabled) {
      const status = report.thresholdStatus.status.toUpperCase();
      const reasons = report.thresholdStatus.reasons.length
        ? ` (${report.thresholdStatus.reasons.join(', ')})`
        : '';
      console.log(`Gate: ${status}${reasons}`);
    }
    console.log('');
  }

  console.log(`Checked: ${checked} | Skipped: ${skipped} | Issues: ${totalIssues} | Score: ${totalScore}`);
  console.log(`Severity totals: high ${totalHigh} | medium ${totalMedium} | low ${totalLow}`);
  if (gateEnabled) {
    console.log(`Thresholds (per file): high>=${thresholds.high}, medium>=${thresholds.medium}, low>=${thresholds.low}`);
    const gateStatus = errorFiles > 0 ? 'FAIL' : 'PASS';
    console.log(`Gate: ${gateStatus} | Errors: ${errorFiles} | Warnings: ${warningFiles}`);
  }

  if (strict && totalIssues > 0) {
    process.exitCode = 1;
  } else if (gateEnabled && errorFiles > 0) {
    process.exitCode = 1;
  }
}

function extractTargets(entries) {
  const targets = [];
  for (let i = 0; i < entries.length; i += 1) {
    const arg = entries[i];
    if (arg.startsWith('--')) {
      if (FLAGS_WITH_VALUES.has(arg)) {
        i += 1;
      }
      continue;
    }
    targets.push(arg);
  }
  return targets;
}

function resolveThresholds(entries) {
  const thresholds = { ...DEFAULT_THRESHOLDS };
  const high = readNumericFlag(entries, '--max-high');
  const medium = readNumericFlag(entries, '--max-medium');
  const low = readNumericFlag(entries, '--max-low');

  if (Number.isFinite(high) && high >= 0) {
    thresholds.high = high;
  }
  if (Number.isFinite(medium) && medium >= 0) {
    thresholds.medium = medium;
  }
  if (Number.isFinite(low) && low >= 0) {
    thresholds.low = low;
  }

  return thresholds;
}

function resolveReportPath(entries) {
  const defaultPath = path.join(ROOT, 'temp', 'lint-report.json');
  const withEquals = entries.find((arg) => arg.startsWith('--report-path=') || arg.startsWith('--report-json='));
  if (withEquals) {
    const value = withEquals.split('=')[1];
    if (value) {
      return path.resolve(value);
    }
    return defaultPath;
  }
  const pathIndex = entries.indexOf('--report-path');
  if (pathIndex !== -1) {
    const value = entries[pathIndex + 1];
    if (value && !value.startsWith('--')) {
      return path.resolve(value);
    }
    return defaultPath;
  }
  const jsonIndex = entries.indexOf('--report-json');
  if (jsonIndex !== -1) {
    const value = entries[jsonIndex + 1];
    if (value && !value.startsWith('--')) {
      return path.resolve(value);
    }
    return defaultPath;
  }
  if (entries.includes('--report')) {
    return defaultPath;
  }
  return null;
}

function readNumericFlag(entries, flag) {
  const withEquals = entries.find((arg) => arg.startsWith(`${flag}=`));
  if (withEquals) {
    const value = Number(withEquals.split('=')[1]);
    return Number.isFinite(value) ? value : undefined;
  }
  const index = entries.indexOf(flag);
  if (index !== -1 && index + 1 < entries.length) {
    const value = Number(entries[index + 1]);
    return Number.isFinite(value) ? value : undefined;
  }
  return undefined;
}

function resolveTargets(entries, options = {}) {
  const files = new Set();
  const includeDocs = Boolean(options.includeDocs);

  for (const entry of entries) {
    const resolved = path.resolve(entry);
    if (!fs.existsSync(resolved)) {
      continue;
    }
    const stat = fs.statSync(resolved);
    if (stat.isFile()) {
      if (path.basename(resolved) === 'article.md' || (includeDocs && resolved.endsWith('.md'))) {
        files.add(resolved);
      }
      continue;
    }
    if (stat.isDirectory()) {
      walk(resolved, files, includeDocs);
    }
  }

  return Array.from(files).sort();
}

function walk(dirPath, files, includeDocs) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (['.git', 'node_modules', 'build', 'temp'].includes(entry.name)) {
        continue;
      }
      walk(fullPath, files, includeDocs);
    } else if (entry.isFile()) {
      if (entry.name === 'article.md' || (includeDocs && entry.name.endsWith('.md'))) {
        files.add(fullPath);
      }
    }
  }
}

function lintDocument(filePath, parsed, options = {}) {
  const issues = [];
  const { frontmatter, frontmatterLines, body, bodyStartLine } = parsed;
  const isArticle = options.isArticle !== false;

  if (isArticle) {
    lintFrontmatterField(filePath, 'title', frontmatter, frontmatterLines, issues);
    lintFrontmatterField(filePath, 'summary', frontmatter, frontmatterLines, issues);
  }

  lintBody(filePath, body, bodyStartLine, issues, { isArticle });
  if (isArticle) {
    lintMetrics(filePath, body, issues);
  }

  const score = issues.reduce((sum, issue) => sum + issue.weight, 0);
  return { filePath, score, issues, severityCounts: tallySeverities(issues) };
}

function lintFrontmatterField(filePath, field, frontmatter, frontmatterLines, issues) {
  const value = frontmatter[field];
  if (!value) {
    return;
  }
  const lineNumber = frontmatterLines[field] || 1;
  lintLine(filePath, value, lineNumber, issues);
}

function lintBody(filePath, body, lineOffset, issues, options = {}) {
  const lines = body.split(/\r?\n/);
  const isArticle = options.isArticle !== false;
  let inCode = false;
  let prevBlank = true;
  let paragraphLines = [];
  let paragraphStartLine = 0;
  let listMode = null;
  let orderedListBlocks = 0;
  let unorderedListBlocks = 0;
  const paragraphs = [];

  function flushParagraph() {
    if (!paragraphLines.length) {
      return;
    }
    const paragraphText = paragraphLines.join(' ').trim();
    if (paragraphText) {
      if (isArticle) {
        lintContrastParagraph(paragraphText, paragraphStartLine, issues);
      }
      paragraphs.push({ text: paragraphText, line: paragraphStartLine });
    }
    paragraphLines = [];
    paragraphStartLine = 0;
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNumber = lineOffset + i;

    if (trimmed.startsWith('```')) {
      if (!inCode) {
        flushParagraph();
        listMode = null;
      }
      inCode = !inCode;
      continue;
    }

    if (inCode) {
      continue;
    }

    const isOrdered = /^\s*\d+[.)]\s+\S/.test(line);
    const isUnordered = /^\s*[-*+]\s+\S/.test(line);

    if (isOrdered) {
      if (listMode !== 'ordered') {
        orderedListBlocks += 1;
        listMode = 'ordered';
      }
    } else if (isUnordered) {
      if (listMode !== 'unordered') {
        unorderedListBlocks += 1;
        listMode = 'unordered';
      }
    } else {
      listMode = null;
    }

    if (trimmed) {
      lintLine(filePath, line, lineNumber, issues, { isArticle });
      if (prevBlank) {
        if (isArticle) {
          lintParagraphStart(filePath, line, lineNumber, issues);
        }
        paragraphStartLine = lineNumber;
      }
      if (!isOrdered && !isUnordered) {
        paragraphLines.push(line);
      }
      prevBlank = false;
    } else {
      flushParagraph();
      prevBlank = true;
      listMode = null;
    }
  }

  flushParagraph();
  if (isArticle) {
    lintListBlocks(orderedListBlocks, unorderedListBlocks, issues);
    lintConditionalClosing(paragraphs, issues);
    lintSentenceOpeners(paragraphs, issues);
    lintParagraphLengths(paragraphs, issues);
  }
}

function lintLine(filePath, line, lineNumber, issues, options = {}) {
  const isArticle = options.isArticle !== false;
  const hasBackticks = line.includes('`');
  for (const rule of RULES) {
    if (rule.paragraphStart) {
      continue;
    }
    if (!isArticle && !rule.docs) {
      continue;
    }
    const subject = rule.skipInlineCode && hasBackticks ? stripInlineCode(line) : line;
    for (const pattern of rule.patterns) {
      if (pattern.test(subject)) {
        addIssue(issues, {
          line: lineNumber,
          weight: rule.weight,
          message: `${rule.message}: "${extractMatch(pattern, subject)}"`
        });
      }
    }
  }
}

function lintContrastParagraph(paragraph, lineNumber, issues) {
  let score = 0;
  const matches = [];

  for (const pattern of CONTRAST_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(paragraph)) !== null) {
      score += pattern.weight;
      matches.push({ label: pattern.label, text: match[0] });
    }
  }

  if (!score) {
    return;
  }

  const capped = Math.min(score, CONTRAST_PARAGRAPH_CAP);
  const sample = matches.slice(0, 3).map((item) => `${item.label}: "${trimSnippet(item.text)}"`).join('; ');
  addIssue(issues, {
    line: lineNumber,
    weight: capped,
    message: `Contrast framing (${score} raw, ${capped} capped). ${sample}`
  });
}

function lintConditionalClosing(paragraphs, issues) {
  if (!paragraphs.length) {
    return;
  }
  const last = paragraphs[paragraphs.length - 1];
  const sentences = splitSentences(last.text);
  if (sentences.length < 2) {
    return;
  }
  const ifStarts = sentences.filter((sentence) => sentence.trim().toLowerCase().startsWith('if ')).length;
  if (ifStarts >= 2) {
    addIssue(issues, {
      line: last.line,
      weight: 3,
      message: `Conditional closing (multiple "If" sentences in final paragraph)`
    });
  }
}

function lintListBlocks(orderedCount, unorderedCount, issues) {
  const total = orderedCount + unorderedCount;
  const allowed = 1;
  if (total <= allowed) {
    return;
  }
  const over = total - allowed;
  addIssue(issues, {
    line: 0,
    weight: 2 * over,
    message: `List blocks (${total}) exceed preferred max (${allowed}). Ordered: ${orderedCount}, unordered: ${unorderedCount}`
  });
}

function lintSentenceOpeners(paragraphs, issues) {
  for (const paragraph of paragraphs) {
    const sentences = splitSentences(paragraph.text);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) {
        continue;
      }
      if (/^(And|But)\b/.test(trimmed)) {
        addIssue(issues, {
          line: paragraph.line,
          weight: 2,
          message: 'Conjunction sentence opener (prefer to join the previous sentence)'
        });
        break;
      }
    }
  }
}

function lintParagraphStart(filePath, line, lineNumber, issues) {
  for (const rule of RULES) {
    if (!rule.paragraphStart) {
      continue;
    }
    for (const pattern of rule.patterns) {
      if (pattern.test(line)) {
        addIssue(issues, {
          line: lineNumber,
          weight: rule.weight,
          message: `${rule.message}: "${extractMatch(pattern, line)}"`
        });
      }
    }
  }
}

function lintMetrics(filePath, body, issues) {
  const cleaned = stripCodeBlocks(body);
  const sentences = splitSentences(cleaned);
  if (sentences.length < 3) {
    return;
  }
  const lineCount = cleaned ? cleaned.split(/\r?\n/).length : 0;

  if (lineCount) {
    const emdashCount = countMatches(cleaned, EMDASH_PATTERN);
    const allowed = Math.max(1, Math.ceil(lineCount / EMDASH_LINES_PER));
    if (emdashCount > allowed) {
      addIssue(issues, {
        line: 0,
        weight: 3,
        message: `Em dash density (${emdashCount}/${lineCount} lines, allowed ${allowed})`
      });
    }

    for (const rule of PUNCTUATION_RULES) {
      const count = countMatches(cleaned, rule.regex);
      if (count) {
        const weight = rule.weight * Math.min(count, 3);
        addIssue(issues, {
          line: 0,
          weight,
          message: `${rule.message} (${count})`
        });
      }
    }
  }

  if (sentences.length >= 6) {
    const lengths = sentences.map((sentence) => wordCount(sentence));
    const variance = stddev(lengths);
    if (variance < 4) {
      addIssue(issues, {
        line: 0,
        weight: 4,
        message: `Low sentence-length variance (${variance.toFixed(2)})`
      });
    }

    const markerCount = sentences.filter(startsWithMarker).length;
    const ratio = markerCount / sentences.length;
    if (ratio >= 0.35) {
      addIssue(issues, {
        line: 0,
        weight: 3,
        message: `High discourse-marker ratio (${(ratio * 100).toFixed(0)}%)`
      });
    }

    const hedgeCount = countHedges(cleaned);
    const hedgeRatio = hedgeCount / sentences.length;
    if (hedgeCount >= 3 || hedgeRatio >= 0.2) {
      addIssue(issues, {
        line: 0,
        weight: 2,
        message: `Hedge density (${hedgeCount} hedges, ${(hedgeRatio * 100).toFixed(0)}%)`
      });
    }

    const weakVerbCount = countWeakVerbs(sentences);
    const weakVerbRatio = weakVerbCount / sentences.length;
    if (weakVerbCount >= 4 || weakVerbRatio >= 0.35) {
      addIssue(issues, {
        line: 0,
        weight: 2,
        message: `Weak-verb density (${weakVerbCount} sentences, ${(weakVerbRatio * 100).toFixed(0)}%)`
      });
    }

    const repeatedOpenerCount = countRepeatedOpeners(sentences);
    if (repeatedOpenerCount > 0) {
      addIssue(issues, {
        line: 0,
        weight: 3,
        message: `Repeated sentence openers (${repeatedOpenerCount})`
      });
    }

    const listyCount = countListySentences(sentences);
    if (listyCount > 0) {
      addIssue(issues, {
        line: 0,
        weight: 2,
        message: `List-heavy sentences (${listyCount})`
      });
    }

    const shortSentenceCount = countShortSentences(sentences, SHORT_SENTENCE_MAX);
    if (shortSentenceCount > 0) {
      addIssue(issues, {
        line: 0,
        weight: 2,
        message: `Short sentences (≤${SHORT_SENTENCE_MAX} words): ${shortSentenceCount}`
      });
    }
  }
}

function stripCodeBlocks(text) {
  return text.replace(/```[\s\S]*?```/g, '');
}

function stripInlineCode(text) {
  return text.replace(/`[^`]*`/g, '');
}

function splitSentences(text) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return [];
  }
  return cleaned.split(/(?<=[.!?])\s+/);
}

function wordCount(text) {
  const matches = text.match(/[A-Za-z0-9']+/g);
  return matches ? matches.length : 0;
}

function startsWithMarker(sentence) {
  const lower = sentence.trim().toLowerCase();
  return DISCOURSE_MARKERS.some((marker) => lower.startsWith(marker + ' '));
}

function countHedges(text) {
  const matches = text.match(/\b(kind of|sort of|maybe|probably|generally|somewhat)\b/gi);
  return matches ? matches.length : 0;
}

function countWeakVerbs(sentences) {
  let count = 0;
  for (const sentence of sentences) {
    const trimmed = sentence.trim().toLowerCase();
    if (!trimmed) {
      continue;
    }
    for (const verb of WEAK_VERBS) {
      if (trimmed.startsWith(verb + ' ') || trimmed.startsWith('i ' + verb + ' ')) {
        count += 1;
        break;
      }
    }
  }
  return count;
}

function countListySentences(sentences) {
  let count = 0;
  for (const sentence of sentences) {
    const text = sentence.trim();
    if (!text) {
      continue;
    }
    if (/_January\s+\d{1,2},\s+\d{4}_\s+\|\s+Series:/i.test(text)) {
      continue;
    }
    if (/^Tags(?::|\s+include)/i.test(text)) {
      continue;
    }
    const commaCount = (text.match(/,/g) || []).length;
    if (commaCount < 2) {
      continue;
    }
    if (/\b(and|or)\b/i.test(text)) {
      count += 1;
    }
  }
  return count;
}

function countShortSentences(sentences, maxWords) {
  let count = 0;
  for (const sentence of sentences) {
    const text = sentence.trim();
    if (!text) {
      continue;
    }
    if (/_January\s+\d{1,2},\s+\d{4}_\s+\|\s+Series:/i.test(text)) {
      continue;
    }
    if (/^Tags(?::|\s+include)/i.test(text)) {
      continue;
    }
    if (text.endsWith(':')) {
      continue;
    }
    const words = wordCount(text);
    if (words > 0 && words <= maxWords) {
      count += 1;
    }
  }
  return count;
}

function lintParagraphLengths(paragraphs, issues) {
  if (!paragraphs.length) {
    return;
  }
  const eligible = [];
  const shortLines = [];
  for (const paragraph of paragraphs) {
    const text = paragraph.text.trim();
    if (!text) {
      continue;
    }
    if (shouldSkipParagraph(text)) {
      continue;
    }
    const count = splitSentences(text).length;
    eligible.push({ count, line: paragraph.line });
    if (count <= 2) {
      shortLines.push(paragraph.line);
    }
  }
  if (eligible.length < 4) {
    return;
  }
  const shortRatio = shortLines.length / eligible.length;
  if (shortLines.length >= 3 && shortRatio >= 0.4) {
    const sample = shortLines.slice(0, 5).join(', ');
    addIssue(issues, {
      line: 0,
      weight: 2,
      message: `Short paragraphs (≤2 sentences): ${shortLines.length}/${eligible.length}. Lines: ${sample}`
    });
  }
  const variance = stddev(eligible.map((item) => item.count));
  if (variance < 0.5) {
    addIssue(issues, {
      line: 0,
      weight: 2,
      message: `Low paragraph-length variance (${variance.toFixed(2)})`
    });
  }
}

function shouldSkipParagraph(text) {
  if (/^#+\s+/.test(text)) {
    return true;
  }
  if (/_January\s+\d{1,2},\s+\d{4}_\s+\|\s+Series:/i.test(text)) {
    return true;
  }
  if (/^Tags(?::|\s+include)/i.test(text)) {
    return true;
  }
  if (/^Related posts:/i.test(text)) {
    return true;
  }
  return false;
}

function countRepeatedOpeners(sentences) {
  let repeats = 0;
  let prev = null;
  for (const sentence of sentences) {
    const opener = sentence.trim().split(/\s+/).slice(0, 2).join(' ').toLowerCase();
    if (prev && opener && opener === prev) {
      repeats += 1;
    }
    prev = opener || prev;
  }
  return repeats;
}

function stddev(numbers) {
  if (!numbers.length) {
    return 0;
  }
  const mean = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  const variance = numbers.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / numbers.length;
  return Math.sqrt(variance);
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
  const parsedFrontmatter = parseFrontmatterLines(frontmatterLines, 2);

  return {
    frontmatter: parsedFrontmatter.data,
    frontmatterLines: parsedFrontmatter.lineMap,
    body,
    bodyStartLine: endIndex + 2
  };
}

function parseFrontmatterLines(lines, startLineNumber) {
  const data = {};
  const lineMap = {};
  let currentKey = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineNumber = startLineNumber + i;

    if (!line.trim()) {
      continue;
    }

    if (line.trim().startsWith('#')) {
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      const rawValue = keyMatch[2];
      lineMap[currentKey] = lineNumber;

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

  return { data, lineMap };
}

function stripQuotes(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function addIssue(issues, { line, weight, message, severity }) {
  const resolvedSeverity = severity || severityFromWeight(weight);
  issues.push({
    line,
    weight,
    severity: resolvedSeverity,
    message
  });
}

function severityFromWeight(weight) {
  if (weight >= 8) {
    return 'high';
  }
  if (weight >= 4) {
    return 'medium';
  }
  return 'low';
}

function tallySeverities(issues) {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const issue of issues) {
    const severity = issue.severity || severityFromWeight(issue.weight);
    if (!counts[severity]) {
      counts[severity] = 0;
    }
    counts[severity] += 1;
  }
  return counts;
}

function evaluateThresholds(counts, thresholds) {
  const reasons = [];
  if (counts.high >= thresholds.high) {
    reasons.push(`high >= ${thresholds.high}`);
  }
  if (counts.medium >= thresholds.medium) {
    reasons.push(`medium >= ${thresholds.medium}`);
  }
  if (counts.low >= thresholds.low) {
    reasons.push(`low >= ${thresholds.low}`);
  }
  if (reasons.length) {
    return { status: 'error', reasons };
  }
  const total = counts.high + counts.medium + counts.low;
  if (total > 0) {
    return { status: 'warn', reasons: [] };
  }
  return { status: 'pass', reasons: [] };
}

function extractMatch(pattern, line) {
  const match = line.match(pattern);
  if (!match) {
    return line.trim();
  }
  return match[0].trim();
}

function trimSnippet(text) {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= 80) {
    return trimmed;
  }
  return `${trimmed.slice(0, 77)}...`;
}

function countMatches(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function writeReport(reportPath, payload) {
  const dir = path.dirname(reportPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(payload, null, 2));
}

main();
