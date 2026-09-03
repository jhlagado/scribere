const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');

const buildScript = path.resolve(__dirname, '..', 'scripts', 'build.js');

function write(root, relativePath, contents) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

function buildFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scribere-build-'));

  write(root, 'content/site.json', JSON.stringify({
    siteName: 'Test Notebook',
    siteDescription: 'Build output fixture.',
    siteUrl: 'https://example.test',
    author: 'Test Author',
    language: 'en-AU'
  }));
  write(root, 'content/queries.json', JSON.stringify({
    'article-pages': { source: 'blog', status: 'published', sort: 'date-asc' },
    'latest-posts': { source: 'blog', status: 'published', sort: 'date-desc' },
    'all-published-posts': { source: 'blog', status: 'published', sort: 'date-asc' }
  }));
  write(root, 'content/templates/summary-index.html', [
    '<!doctype html><html><head><!-- meta:head --></head><body>',
    '<main><div data-slot="page-heading"></div><div data-slot="page-intro"></div>',
    '<div data-slot="page-body"></div><div data-slot="page-extra"></div></main>',
    '</body></html>'
  ].join(''));
  write(root, 'content/templates/article.html', [
    '<!doctype html><html><head><!-- meta:head --></head><body>',
    '<main><article><template data-query="article-page"><p>Missing.</p></template></article>',
    '<nav class="article-navigation" aria-label="Article navigation">',
    '<section><p>Earlier entry</p><template data-query="article-previous" data-view="summary"><p>Beginning of log</p></template></section>',
    '<section><p>Later entry</p><template data-query="article-next" data-view="summary"><p>Latest entry</p></template></section>',
    '</nav></main></body></html>'
  ].join(''));
  write(root, 'content/templates/about.html', [
    '<!doctype html><html><head><!-- meta:head --></head>',
    '<body><main><h1>About</h1></main></body></html>'
  ].join(''));

  write(root, 'content/2026/01/02/01-first/article.md', [
    '---',
    'status: published',
    'title: "First article"',
    'summary: "First summary."',
    'tags:',
    '  - z80',
    '---',
    '',
    '# First article',
    '',
    'FIRST-BODY-SHOULD-NOT-APPEAR-ON-HOME',
    ''
  ].join('\n'));
  write(root, 'content/2026/03/04/01-second/article.md', [
    '---',
    'status: published',
    'title: "Second article"',
    'summary: "Second summary."',
    'thumbnail: assets/hero.png',
    'tags:',
    '  - ai',
    '---',
    '',
    '# Second article',
    '',
    'SECOND-BODY-SHOULD-NOT-APPEAR-ON-HOME',
    ''
  ].join('\n'));
  write(root, 'content/2026/03/04/01-second/assets/hero.png', 'fixture');

  execFileSync(process.execPath, [buildScript], { cwd: root, stdio: 'pipe' });
  return root;
}

test('home renders linked summaries with hero metadata and Australian dates', (t) => {
  const root = buildFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const html = fs.readFileSync(path.join(root, 'build/index.html'), 'utf8');

  assert.match(html, /<article class="summary" data-primary-tag="ai">/);
  assert.match(html, /<time datetime="2026-03-04">4 March 2026<\/time>/);
  assert.match(html, /src="\/content\/2026\/03\/04\/01-second\/assets\/hero\.png"/);
  assert.match(html, /Second summary\./);
  assert.doesNotMatch(html, /SECOND-BODY-SHOULD-NOT-APPEAR-ON-HOME/);
});

test('article pages expose chronological earlier and later entries', (t) => {
  const root = buildFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const first = fs.readFileSync(path.join(root, 'build/content/2026/01/02/01-first/index.html'), 'utf8');
  const second = fs.readFileSync(path.join(root, 'build/content/2026/03/04/01-second/index.html'), 'utf8');

  assert.match(first, /Later entry[\s\S]*href="\/content\/2026\/03\/04\/01-second\/"/);
  assert.match(second, /Earlier entry[\s\S]*href="\/content\/2026\/01\/02\/01-first\/"/);
});
