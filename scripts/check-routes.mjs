/**
 * Route, link and responsive smoke test against a running preview server.
 *
 *   npm run build && npm run preview &
 *   npm run test:routes            # or: node scripts/check-routes.mjs http://localhost:8788
 *
 * Checks, for every route:
 *   - HTTP 200 (and 404 for an unknown URL)
 *   - exactly one <h1>, a <title>, a meta description and a canonical link
 *   - no console errors or uncaught exceptions
 *   - no horizontal overflow at each target viewport width
 *   - every internal link resolves
 */
import { chromium } from './_playwright.mjs';

const base = (process.argv[2] ?? 'http://localhost:4321').replace(/\/$/, '');
const routes = [
  '/', '/about/', '/services/', '/services/digital-engineering/', '/services/data-intelligence/',
  '/services/ai-automation/', '/portfolio/', '/portfolio/service-operations-platform/',
  '/portfolio/executive-revenue-dashboard/', '/portfolio/customer-support-ai-agent/',
  '/portfolio/supply-chain-kpi-system/', '/portfolio/editorial-brand-website/',
  '/portfolio/invoice-workflow-automation/', '/process/', '/contact/', '/faq/', '/privacy-policy/', '/terms/',
];
const widths = [360, 375, 390, 430, 768, 1024, 1280, 1366, 1440, 1920];
const failures = [];
const fail = (msg) => { failures.push(msg); console.log('  ✗', msg); };

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
let current = '';
page.on('pageerror', (e) => fail(`${current}: uncaught ${e.message}`));
page.on('console', (m) => m.type() === 'error' && !/favicon/.test(m.text()) && fail(`${current}: console error ${m.text()}`));

const links = new Set();
for (const route of routes) {
  current = route;
  console.log(route);
  const res = await page.goto(base + route, { waitUntil: 'networkidle' });
  if (res?.status() !== 200) fail(`${route}: status ${res?.status()}`);
  const meta = await page.evaluate(() => ({
    h1: document.querySelectorAll('h1').length,
    title: document.title,
    description: document.querySelector('meta[name=description]')?.getAttribute('content') ?? '',
    canonical: document.querySelector('link[rel=canonical]')?.getAttribute('href') ?? '',
    hrefs: Array.from(document.querySelectorAll('a[href^="/"]')).map((a) => a.getAttribute('href')),
    unlabeled: Array.from(document.querySelectorAll('img:not([alt])')).length,
  }));
  if (meta.h1 !== 1) fail(`${route}: ${meta.h1} <h1> elements`);
  if (!meta.title) fail(`${route}: missing <title>`);
  if (meta.description.length < 50) fail(`${route}: meta description too short`);
  if (!meta.canonical) fail(`${route}: missing canonical`);
  if (meta.unlabeled) fail(`${route}: ${meta.unlabeled} <img> without alt`);
  meta.hrefs.forEach((h) => links.add(h.split('#')[0].split('?')[0]));

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(60);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) fail(`${route}: ${overflow}px horizontal overflow at ${width}px`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

console.log('internal links');
for (const href of links) {
  const res = await context.request.get(base + href);
  if (res.status() !== 200) fail(`broken internal link ${href} → ${res.status()}`);
}
for (const file of ['/robots.txt', '/sitemap-index.xml', '/og.png', '/favicon.svg', '/posters/hero.webp', '/posters/ecosystem.webp']) {
  const res = await context.request.get(base + file);
  if (res.status() !== 200) fail(`${file} → ${res.status()}`);
}
const missing = await context.request.get(base + '/this-page-does-not-exist/');
if (missing.status() !== 404) fail(`unknown URL returned ${missing.status()}, expected 404`);

await browser.close();
console.log(failures.length ? `\n${failures.length} problem(s) found` : `\nAll ${routes.length} routes passed at ${widths.length} widths`);
process.exit(failures.length ? 1 : 0);
