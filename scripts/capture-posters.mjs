/**
 * Renders the two WebGL scenes in headless Chromium and saves a deterministic
 * frame of each as a transparent WebP poster. The posters are the loading
 * state, the reduced-motion version and the no-WebGL fallback.
 *
 *   npm run build && npm run preview &   # serve dist on :4321
 *   node scripts/capture-posters.mjs [baseUrl]
 */
import { chromium } from './_playwright.mjs';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const base = process.argv[2] ?? 'http://localhost:4321';
await mkdir('public/posters', { recursive: true });

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('[page error]', e.message));
await page.goto(`${base}/?capture`, { waitUntil: 'networkidle' });

async function grab(selector, file) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.waitForSelector(`${selector} canvas`, { timeout: 60_000 });
  await page.waitForTimeout(4000); // let the environment map and shadows settle
  const dataUrl = await page.$eval(`${selector} canvas`, (c) => c.toDataURL('image/png'));
  const png = Buffer.from(dataUrl.split(',')[1], 'base64');
  const out = await sharp(png).resize(1200, 1200, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 82, alphaQuality: 90 }).toFile(file);
  console.log(`${file}: ${out.width}x${out.height}, ${(out.size / 1024).toFixed(0)} kB`);
}

await grab('[data-sculpture]', 'public/posters/hero.webp');
await grab('[data-ecosystem-stage]', 'public/posters/ecosystem.webp');
await browser.close();
