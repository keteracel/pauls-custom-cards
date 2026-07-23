// Headless-browser render check for the testbed cards.
//
// Serves the repo root, loads testbed.html in headless Chromium, waits for the
// custom elements to render, asserts key content is present in their shadow
// DOM, and writes screenshots to screenshots/ for a visual eyeball.
//
//   npm run verify:render          # assert + screenshot
//   npm run verify:render -- --headed   # watch it run
//
// Requires a prior `npm run build` (loads dist/pauls-cards.js).

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'screenshots');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.map': 'application/json',
  '.svg': 'image/svg+xml',
};

function serve() {
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(req.url.split('?')[0]);
      const file = join(ROOT, path === '/' ? 'testbed.html' : path);
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`  ✗ ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

const server = await serve();
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
const page = await browser.newPage({ viewport: { width: 1400, height: 1600 } });
page.on('pageerror', (e) => console.error('  [pageerror]', e.message));

await page.goto(`${base}/testbed.html`, { waitUntil: 'load' });
await page.waitForFunction(() => customElements.get('paul-wind-card') !== undefined);
// Let the module scripts mount the cards and Lit flush a frame.
await page.waitForFunction(() => {
  const c = document.querySelector('#wind-grid paul-wind-card');
  return c?.shadowRoot?.querySelector('svg.compass');
});
await page.waitForTimeout(200);

console.log('\nWind card render checks:');

// A compass SVG with a needle exists in the first static example.
const first = await page.evaluate(() => {
  const c = document.querySelector('#wind-grid paul-wind-card');
  const sr = c.shadowRoot;
  return {
    hasCompass: !!sr.querySelector('svg.compass'),
    hasNeedle: !!sr.querySelector('.needle-main'),
    speed: sr.querySelector('.speed')?.textContent?.trim(),
    cardinal: sr.querySelector('.cardinal-text')?.textContent?.replace(/\s+/g, ' ').trim(),
  };
});
assert(first.hasCompass, 'compass SVG rendered');
assert(first.hasNeedle, 'direction needle rendered');
assert(first.speed === '12.4', `centre speed reads 12.4 (got "${first.speed}")`);
assert(/^SE · 135°$/.test(first.cardinal), `135° maps to "SE · 135°" (got "${first.cardinal}")`);

// The gust+averages example shows all three secondary readouts + an average needle.
const third = await page.evaluate(() => {
  const c = document.querySelectorAll('#wind-grid paul-wind-card')[2];
  const sr = c.shadowRoot;
  const stats = [...sr.querySelectorAll('.stat')].map((s) => ({
    label: s.querySelector('.stat-label')?.textContent?.trim(),
    value: s.querySelector('.stat-value')?.textContent?.trim(),
  }));
  return { stats, hasAvgNeedle: !!sr.querySelector('.needle-avg') };
});
assert(third.stats.length === 3, `3 secondary readouts (got ${third.stats.length})`);
assert(third.stats.some((s) => s.label === 'Gust'), 'gust readout present');
assert(third.stats.some((s) => s.label === 'Avg dir'), 'average direction readout present');
assert(third.hasAvgNeedle, 'average-direction needle rendered');

// Screenshots
await page.evaluate(() => document.querySelector('#wind-grid').scrollIntoView());
await page.locator('#wind-grid').screenshot({ path: join(OUT, 'wind-static.png') });
await page.locator('#wind-live').screenshot({ path: join(OUT, 'wind-interactive.png') });
console.log(`\nScreenshots written to ${OUT}/`);

await browser.close();
server.close();

if (process.exitCode) {
  console.error('\nRender verification FAILED.');
} else {
  console.log('\nRender verification passed.');
}
