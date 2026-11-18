/** Renders the 1200×630 Open Graph image to public/og.png. Run after capture-posters. */
import { chromium } from './_playwright.mjs';
import { readFile } from 'node:fs/promises';

const b64 = async (p) => (await readFile(p)).toString('base64');
const display = await b64('node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2');
const mono = await b64('node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2');
const poster = await b64('public/posters/hero.webp');

const html = `<!doctype html><html><head><style>
@font-face{font-family:D;src:url(data:font/woff2;base64,${display}) format('woff2');font-weight:200 800}
@font-face{font-family:M;src:url(data:font/woff2;base64,${mono}) format('woff2');font-weight:100 900}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#F7F8FC;color:#142B4A;font-family:D;position:relative;overflow:hidden}
.halo{position:absolute;right:-40px;top:15px;width:600px;height:600px;border-radius:50%;background:radial-gradient(closest-side,#DCE9F8,rgba(220,233,248,.5) 50%,transparent)}
img{position:absolute;right:-30px;top:10px;width:610px;height:610px}
.brand{position:absolute;left:64px;top:56px;display:flex;align-items:center;gap:14px;font-weight:700;font-size:30px;letter-spacing:-.03em}
h1{position:absolute;left:64px;top:190px;font-size:104px;line-height:.92;letter-spacing:-.045em;font-weight:700;text-transform:uppercase}
h1 span{background:linear-gradient(#B8F34A,#B8F34A) no-repeat 0 88%/100% .34em}
p{position:absolute;left:64px;bottom:60px;font-family:M;font-size:20px;letter-spacing:.14em;text-transform:uppercase}
</style></head><body>
<div class="halo"></div><img src="data:image/webp;base64,${poster}">
<div class="brand"><svg width="44" height="44" viewBox="0 0 30 30" fill="none"><rect x="2" y="9" width="26" height="12" rx="2.5" stroke="#142B4A" stroke-width="2.4"/><rect x="9" y="2" width="12" height="26" rx="2.5" stroke="#142B4A" stroke-width="2.4"/><rect x="12" y="12" width="6" height="6" rx="1" fill="#B8F34A"/></svg>AT NEXORA</div>
<h1>Engineering<br>what’s <span>next.</span></h1>
<p>Digital Engineering · Data Intelligence · AI &amp; Automation</p>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'public/og.png' });
await browser.close();
console.log('public/og.png written');
