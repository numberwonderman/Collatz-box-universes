// Browser smoke test: loads every page, clicks each distinct button once, and fails on
// any uncaught error, console error, or missing local file. Also checks a few real results.
//
//   npx playwright install chromium   (first time only)
//   npm run test:pages
//
// Options (environment variables):
//   CHROME_PATH=/path/to/chrome   use an installed Chrome instead of Playwright's Chromium
//   STUB_CDN=1                    blank out Tailwind, fonts and MathJax (styling only) for offline runs
//   THREE_R128_DIR=/path/to/three-0.128.0   serve Three.js r128 from a local copy of the npm package
//                                 (`npm pack three@0.128.0`) instead of the CDN

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://box.local';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

// Buttons whose click intentionally leaves the page or takes long; checked separately below.
const SKIP_CLICK = new Set(['scanBtn']);

const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();

const browser = await chromium.launch({
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}),
});
const context = await browser.newContext();

// Serve the repo from memory so no web server is needed.
await context.route(`${ORIGIN}/**`, route => {
  const file = path.join(ROOT, decodeURIComponent(new URL(route.request().url()).pathname));
  if (file.startsWith(ROOT) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    route.fulfill({ status: 200, body: fs.readFileSync(file), contentType: TYPES[path.extname(file)] || 'application/octet-stream' });
  } else {
    route.fulfill({ status: 404, body: 'not found' });
  }
});
if (process.env.THREE_R128_DIR) {
  const T = process.env.THREE_R128_DIR;
  await context.route(/cdnjs\.cloudflare\.com\/ajax\/libs\/three\.js\/r128\/three\.min\.js/, r => r.fulfill({ body: fs.readFileSync(path.join(T, 'build/three.min.js')), contentType: 'text/javascript' }));
  await context.route(/cdn\.jsdelivr\.net\/npm\/three@0\.128\.0\/(.*)/, r => {
    const f = path.join(T, r.request().url().match(/three@0\.128\.0\/(.*)/)[1]);
    return fs.existsSync(f) ? r.fulfill({ body: fs.readFileSync(f), contentType: 'text/javascript' }) : r.fulfill({ status: 404, body: '' });
  });
}
if (process.env.STUB_CDN) {
  await context.route(/(cdn\.tailwindcss\.com|fonts\.googleapis\.com|font-awesome|mathjax)/, r => r.fulfill({ body: '', contentType: 'text/javascript' }));
}

let failures = 0;
const fail = (page, msg) => { failures++; console.log(`  ✗ ${page}: ${msg}`); };

async function open(name) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`uncaught: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(`console.error: ${m.text()}`); });
  page.on('response', r => { if (r.url().startsWith(ORIGIN) && r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url().slice(ORIGIN.length)}`); });
  page.on('dialog', d => { errors.push(`dialog: ${d.message()}`); d.dismiss(); });
  await page.goto(`${ORIGIN}/${name}`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  return { page, errors };
}

for (const name of pages) {
  const { page, errors } = await open(name);

  // Click each distinct visible button once (by id, or by label for repeated grid buttons).
  const seen = new Set();
  const count = await page.locator('button').count();
  for (let i = 0; i < count; i++) {
    const button = page.locator('button').nth(i);
    if (!(await button.isVisible().catch(() => false))) continue;
    const label = (await button.getAttribute('id')) || (await button.innerText()).trim().slice(0, 30);
    if (seen.has(label) || SKIP_CLICK.has(label)) continue;
    seen.add(label);
    await button.click({ timeout: 5000 }).catch(e => errors.push(`could not click ${label}: ${e.message.split('\n')[0]}`));
    await page.waitForTimeout(400);
    if (!page.url().startsWith(`${ORIGIN}/${name}`)) {
      // Navigation buttons must land on a page that exists.
      const target = new URL(page.url()).pathname.slice(1);
      if (!fs.existsSync(path.join(ROOT, target))) errors.push(`button ${label} navigated to missing ${target}`);
      await page.goto(`${ORIGIN}/${name}`, { waitUntil: 'load' });
      await page.waitForTimeout(800);
    }
  }

  for (const e of [...new Set(errors)]) fail(name, e);
  if (!errors.length) console.log(`  ✓ ${name} (${seen.size} buttons)`);
  await page.close();
}

// ---- Result checks: the pages compute the right thing, not just load ----
async function check(name, query, fn) {
  const { page, errors } = await open(name + query);
  try { await fn(page); } catch (e) { fail(name, e.message); }
  for (const e of errors) fail(name, e);
  await page.close();
}

await check('index.html', '?n=27&x=2&y=3&z=1', async page => {
  const steps = await page.textContent('#currentSteps');
  if (steps.trim() !== '111') throw new Error(`n=27 should take 111 steps, page shows ${steps}`);
  await page.fill('#xValue', '2'); await page.fill('#yValue', '3'); await page.fill('#zValue', '-1');
  await page.click('#scanBtn');
  await page.waitForFunction(() => document.getElementById('scanStatus').textContent.startsWith('Done'), null, { timeout: 60000 });
  const out = await page.textContent('#catalogOut');
  // 3n-1 has cycles {1,2}, {5,...} and {17,...}; starts reaching 1 count as converging,
  // so the scan should report exactly the 5- and 17-cycles.
  if (out.includes('"cycleMin": "1"')) throw new Error('scan should treat reaching 1 as converging');
  for (const min of ['"5"', '"17"']) if (!out.includes(`"cycleMin": ${min}`)) throw new Error(`3n-1 scan missing cycle with min ${min}`);
});

await check('slicer.html', '?n=27&x=2&y=3&z=1', async page => {
  const info = await page.textContent('#sequenceInfo');
  if (!info.includes('Steps: 111')) throw new Error(`slicer should show 111 steps for n=27, shows "${info}"`);
});

await check('radial-viewer.html', '?n=5&x=2&y=3&z=-1', async page => {
  const type = await page.textContent('#currentType');
  if (!type.includes('Cycle')) throw new Error(`3n-1 from 5 should be a cycle, shows "${type}"`);
});

await browser.close();
console.log(failures ? `\n${failures} problem(s) found.` : '\nAll pages OK.');
process.exit(failures ? 1 : 0);
