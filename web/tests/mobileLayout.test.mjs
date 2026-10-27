import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

test("mobile dashboards fit supported locales and fallback while evidence tables remain scrollable", async () => {
  const server = await createServer({ server: { host: "127.0.0.1", port: 0, hmr: false }, logLevel: "error" });
  let browser;
  try {
    await server.listen();
    const address = server.httpServer.address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;
    browser = await chromium.launch({ headless: true });
    const cases = [
      { query: "en-US", stored: "zh-CN", expected: "en-US" },
      { query: "zh-CN", stored: "fr", expected: "zh-CN" },
      { query: "fr", stored: "fr", expected: "en-US" },
      { query: "fr", stored: "zh-CN", expected: "zh-CN" },
      { query: "", stored: "zh-CN", expected: "zh-CN" },
    ];
    let englishData;
    for (const { query, stored, expected } of cases) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.addInitScript((value) => localStorage.setItem("a-share-zoo-locale", value), stored);
      const errors = [];
      const dataResponses = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) {
          if (url.hostname === "fonts.googleapis.com") {
            return route.fulfill({ contentType: "text/css", body: "" });
          }
          return route.abort();
        }
        const match = url.pathname.match(/^\/data\/(plant\/)?([a-z_]+\.json)$/u);
        if (match) {
          const fixture = path.join(repositoryRoot, "published", match[1] ? "plant" : "", "data", match[2]);
          const body = await readFile(fixture, "utf8");
          dataResponses.push({ path: url.pathname, body });
          return route.fulfill({ contentType: "application/json", body });
        }
        return route.continue();
      });
      await page.goto(`${origin}/${query ? `?lang=${query}` : ""}`, { waitUntil: "domcontentloaded" });
      const canvas = page.locator(".zoo-chart canvas").first();
      await canvas.waitFor();
      assert.equal(await page.locator("html").getAttribute("lang"), expected);
      assert.equal(await page.locator(".site-nav a").first().textContent(), expected === "zh-CN" ? "首页" : "Home");
      for (const control of await page.locator('.site-nav a, .site-nav button').all()) {
        const rect = await control.boundingBox();
        assert.ok(rect && rect.x >= 0 && rect.x + rect.width <= 390, 'navigation controls must be visible without horizontal scrolling');
      }
      assert.ok(!/2026\d{4}/.test(await page.locator('.site-meta').innerText()), 'the shell displays a formatted date');
      await page.locator('.snapshot-guide').first().waitFor();
      const bounds = await canvas.boundingBox();
      assert.ok(bounds && bounds.width > 100 && bounds.width <= 390, `${query || "saved preference"}: chart must fit the viewport`);
      const layout = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth }));
      assert.ok(layout.width <= layout.viewport, `${query || "saved preference"}: page width ${layout.width}px exceeds ${layout.viewport}px`);
      assert.ok(await page.locator(".delisting-audit table").evaluate((table) => table.scrollWidth > table.clientWidth), `${query || "saved preference"}: wide evidence must scroll inside its table`);
      assert.deepEqual(errors, []);
      const orderedData = dataResponses.sort((left, right) => left.path.localeCompare(right.path));
      if (expected === "en-US") englishData = orderedData;
      if (expected === "zh-CN" && query === "zh-CN") assert.deepEqual(orderedData, englishData, "locale must not change public JSON requests or data");
      await page.close();
    }
  } finally {
    await browser?.close();
    await server.close();
  }
});
