import assert from "node:assert/strict";
import test from "node:test";
import { ZOO_UNPRICED_DELIST_CUTOFF, zooHistoryBeforeUnpricedDelist } from "./researchBoundary.ts";

test("animal NAV stops before the first unpriced delisting", () => {
  assert.equal(ZOO_UNPRICED_DELIST_CUTOFF, "20260625");
  const history = ["20260624", "20260625", "20260626", "20260710"].map((date) => ({ date }));
  assert.deepEqual(zooHistoryBeforeUnpricedDelist(history), history.slice(0, 2));
});
