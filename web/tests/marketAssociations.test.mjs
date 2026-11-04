import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import { createServer } from 'vite';

test('observation pool supports locales, evidence, filters and mobile layout', async () => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0, hmr: false }, logLevel: 'error' });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/#/associations`);
    await page.locator('h2').waitFor();
    assert.match(await page.locator('h2').innerText(), /Market associations/u);
    assert.equal(await page.locator('.association-card').count(), 13);
    assert.match(await page.locator('.association-preparation').innerText(), /1, 5 and 20/u);
    assert.equal(await page.locator('.association-preparation a').getAttribute('href'), 'https://github.com/runchengxie/a-share-zoo-garden/actions/runs/41759840493');
    assert.match(await page.locator('.association-boundary').innerText(), /not started/u);
    assert.ok(await page.locator('.association-source a[href^="https://"]').count() >= 13);
    await page.locator('#association-status').selectOption('pending');
    assert.equal(await page.locator('.association-card').count(), 2);
    await page.locator('#association-status').selectOption('confirmed');
    assert.equal(await page.locator('.association-card').count(), 11);
    await page.locator('#association-theme').selectOption('plant');
    assert.equal(await page.locator('.association-card').count(), 0);
    assert.match(await page.locator('[role="status"]').innerText(), /No records/u);
    await page.locator('.locale-toggle').click();
    assert.match(await page.locator('h2').innerText(), /市场联想观察池/u);
    assert.match(await page.locator('.association-preparation').innerText(), /1、5、20/u);
    assert.match(await page.locator('[role="status"]').innerText(), /暂无记录/u);
    await page.locator('#association-theme').selectOption('all');
    await page.locator('#association-status').selectOption('all');
    assert.equal(await page.locator('.association-card').count(), 13);
    const size = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth }));
    assert.ok(size.width <= size.viewport);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
