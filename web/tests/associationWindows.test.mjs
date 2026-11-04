import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

// Synthetic data is isolated to this Vite instance; no published fixture is modified.
test('registered windows distinguish measured, immature and missing observations in both locales', async () => {
  const fixture = {
    status: 'registered_observation', generated_at: new Date().toISOString(), as_of: '2026-11-06', scheduled_baseline: '2026-11-05',
    input_check: { expected_stocks: 11, complete_stocks: 11, benchmark_complete: true },
    entries: [{ id: 'sheep-2027-002086-sz', status: 'evaluated', baseline_date: '2026-11-05', windows: [
      { horizon: 1, status: 'observed', end_date: '2026-11-06', stock_return: 0.12, benchmark_return: 0.03, excess_return: 0.09 },
      { horizon: 5, status: 'not_matured', end_date: null },
      { horizon: 20, status: 'missing_prices', end_date: null },
    ] }],
  };
  const cacheDir = await mkdtemp(join(tmpdir(), "association-windows-"));
  const server = await createServer({
    cacheDir,
    logLevel: 'error', server: { host: '127.0.0.1', port: 0, hmr: false },
    plugins: [{ name: 'synthetic-observation', enforce: 'pre', load(id) {
      if (id.endsWith('/published/data/association_study.json')) return JSON.stringify(fixture);
    } }],
  });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?lang=en-US#/associations`);
    const table = page.locator('.association-performance').first();
    await table.waitFor();
    assert.match(await table.innerText(), /12\.00%/u);
    assert.match(await table.innerText(), /9\.00/u);
    assert.match(await table.innerText(), /Not yet matured/u);
    assert.match(await table.innerText(), /Missing data/u);
    assert.equal(await table.locator('tbody tr').count(), 3);
    await page.locator('.locale-toggle').click();
    assert.match(await table.innerText(), /尚未到期/u);
    assert.match(await table.innerText(), /缺数据/u);
    const layout = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth }));
    assert.ok(layout.width <= layout.viewport);
  } finally {
    await browser?.close();
    await server.close();
    await rm(cacheDir, { recursive: true, force: true });
  }
});
