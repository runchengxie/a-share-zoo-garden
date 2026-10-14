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
