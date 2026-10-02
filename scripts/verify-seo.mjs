import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { createServer } from 'node:http';
import { JSDOM } from 'jsdom';

const root = resolve('dist/nous-app/browser');
const routes = ['', 'finance', 'marketing', 'process', 'ai'];
const site = 'https://nousestrategia.com/';
const titles = new Set();
const descriptions = new Set();
const sitemap = new JSDOM(await readFile(`${root}/sitemap.xml`, 'utf8'), { contentType: 'text/xml' });
assert.deepEqual([...sitemap.window.document.querySelectorAll('loc')].map(el => el.textContent), routes.map(r => site + (r ? `${r}/` : '')));

for (const route of routes) {
  const dom = new JSDOM(await readFile(`${root}/${route ? route + '/' : ''}index.html`, 'utf8'));
  const doc = dom.window.document;
  const meta = (name, attr = 'name') => doc.querySelector(`meta[${attr}="${name}"]`)?.content;
  assert.equal(doc.documentElement.lang, 'es', `${route}: static language`);
  assert.equal(doc.querySelectorAll('h1').length, 1, `${route}: one visible main heading`);
  assert.ok(doc.querySelector('h1').textContent.trim().length > 10);
  assert.ok(doc.querySelector('app-root').textContent.length > 500, `${route}: content without JS`);
  assert.equal(doc.querySelectorAll('link[rel=canonical]').length, 1);
  assert.equal(doc.querySelector('link[rel=canonical]').href, site + (route ? route + '/' : ''));
  assert.match(meta('robots'), /^index,/);
  assert.equal(meta('og:title', 'property'), doc.title);
  assert.equal(meta('twitter:title'), doc.title);
  assert.equal(meta('og:description', 'property'), meta('description'));
  assert.equal(meta('og:locale', 'property'), 'es_CO');
  assert.equal(meta('og:url', 'property'), doc.querySelector('link[rel=canonical]').href);
  assert.ok(meta('description').length > 60);
  titles.add(doc.title);
  descriptions.add(meta('description'));
  const schema = JSON.parse(doc.querySelector('#organization-schema').textContent);
  assert.equal(schema.url, site);
  for (const img of doc.querySelectorAll('img')) assert.ok(img.hasAttribute('alt'), `${route}: image missing alt`);
  dom.window.close();
}
assert.equal(titles.size, 5, 'Unique titles');
assert.equal(descriptions.size, 5, 'Unique descriptions');
const shell = new JSDOM(await readFile(`${root}/index.csr.html`, 'utf8'));
assert.match(shell.window.document.querySelector('meta[name=robots]').content, /noindex/);
shell.window.close();
const image = await readFile(`${root}/images/og-cover.png`);
assert.equal(image.readUInt32BE(16), 1200);
assert.equal(image.readUInt32BE(20), 630);
const robots = await readFile(`${root}/robots.txt`, 'utf8');
assert.ok(robots.includes(`Sitemap: ${site}sitemap.xml`));
assert.ok(!/Disallow: \/(?:login|register|workspace|app)/.test(robots), 'Crawlers can read noindex');
console.log('PASS: five static pages, unique metadata, canonical URLs, sitemap, headings, structured data, social image, and noindex fallback.');

if (process.argv.includes('--browser')) {
  const { chromium } = await import('@playwright/test');
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4' };
  const server = createServer(async (req, res) => {
    try {
      let path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
      if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
      let exists = await stat(path).catch(() => null);
      if (exists?.isDirectory()) { path = resolve(path, 'index.html'); exists = await stat(path).catch(() => null); }
      if (!exists) { path = resolve(root, 'index.csr.html'); res.statusCode = 404; }
      res.setHeader('Content-Type', mime[path.slice(path.lastIndexOf('.'))] ?? 'application/octet-stream');
      res.end(await readFile(path));
    } catch { res.writeHead(500).end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  try {
    const page = await browser.newPage({ locale: 'es-CO' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const route of routes) {
      await page.goto(`${base}/${route ? route + '/' : ''}`);
      await page.locator('button[aria-pressed=true]').filter({ hasText: 'ES' }).waitFor();
      await page.getByRole('button', { name: 'EN', exact: true }).click();
      await page.waitForFunction(() => document.documentElement.lang === 'en' && document.querySelector('meta[property="og:locale"]').content === 'en_US');
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), site + (route ? route + '/' : ''));
      await page.getByRole('button', { name: 'ES', exact: true }).click();
    }
    // Exercise client navigation, not just direct page loads.
    await page.locator('a[href="/finance"]').first().click();
    await page.waitForFunction(() => document.title.startsWith('Finanzas Inteligentes'));
    await page.locator('a[href="/"]').first().click();
    await page.waitForFunction(() => document.title.startsWith('NOUS Estrategia |'));
    await page.locator('input[name=name]').fill('SEO Form Check');
    assert.equal(await page.locator('input[name=name]').inputValue(), 'SEO Form Check');
    // Service cards first select the hero slide; only its main link opens the detail page.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const width of [1366, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const slug of routes.filter(Boolean)) {
        const tile = page.locator(`.tile#${slug}`);
        await tile.scrollIntoViewIfNeeded();
        if (slug === 'ai') { await tile.focus(); await page.keyboard.press('Enter'); }
        else await tile.click();
        await page.waitForFunction(slug => document.querySelector('.hc-slide.is-active a')?.getAttribute('href') === '/' + slug, slug);
        assert.equal(new URL(page.url()).pathname, '/', 'Tile stays on homepage');
        await page.waitForFunction(() => {
          const top = document.querySelector('.hero-carousel').getBoundingClientRect().top;
          // Responsive header/font layout can shift the padded section slightly after scrolling.
          return top >= -20 && top < 150;
        }, null, { timeout: 5000 }).catch(async error => {
          throw new Error(`Carousel scroll failed at ${width}px for ${slug}: ${await page.locator('.hero-carousel').evaluate(el => el.getBoundingClientRect().top)}; ${error.message}`);
        });
        assert.ok(await page.locator('.hero-carousel').evaluate(el => document.activeElement === el), 'Keyboard focus follows carousel');
        await page.locator('.hc-slide.is-active a').click();
        await page.waitForURL(`**/${slug}`);
        await page.locator('.pillar-hero').waitFor();
        await page.goto(base + '/');
      }
    }
    console.log('PASS: all four service cards select and reveal their carousel slide on desktop/mobile; Enter works and the slide opens its detail page.');
    for (const route of ['login', 'register', 'workspace', 'app', 'home', 'missing-page']) {
      await page.goto(`${base}/${route}`);
      await page.waitForFunction(() => !document.querySelector('link[rel=canonical]'));
      assert.match(await page.locator('meta[name=robots]').getAttribute('content'), /noindex/);
      assert.equal(await page.locator('#organization-schema').count(), 0);
    }
    await page.getByRole('link', { name: 'Volver al inicio' }).click();
    await page.waitForFunction(() => document.querySelector('meta[name=robots]').content.startsWith('index,'));
    assert.equal(await page.locator('#organization-schema').count(), 1);
    assert.deepEqual(errors, []);
    console.log('PASS: browser language changes, route metadata updates, private/unknown noindex, public restoration, and editable contact form.');
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise(done => server.close(done));
  }
}
