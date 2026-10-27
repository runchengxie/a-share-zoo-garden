import assert from "node:assert/strict";
import test from "node:test";
import { formatChartMonth } from "./chartDates.ts";

test("chart months format compact trading dates", () => {
  assert.equal(formatChartMonth("20240506"), "2024-05");
  assert.equal(formatChartMonth("20240229"), "2024-02");
});

test("chart months preserve ISO date compatibility and unknown labels", () => {
  assert.equal(formatChartMonth("2024-05-06"), "2024-05");
  assert.equal(formatChartMonth("unknown"), "unknown");
});

test("reader dates use the selected locale and preserve unknown labels", async () => {
  const { formatDisplayDate } = await import('./chartDates.ts');
  assert.equal(formatDisplayDate('20261026', 'zh-CN'), '2026年10月26日');
  assert.equal(formatDisplayDate('2026-10-26', 'en-US'), 'Oct 26, 2026');
  assert.equal(formatDisplayDate('pending', 'zh-CN'), 'pending');
  assert.equal(formatDisplayDate('20260230', 'zh-CN'), '20260230');
});
