import type { NavPoint } from "./api";

export const ZOO_UNPRICED_DELIST_CUTOFF = "20260625";

export function zooHistoryBeforeUnpricedDelist(history: NavPoint[]): NavPoint[] {
  return history.filter((point) => point.date <= ZOO_UNPRICED_DELIST_CUTOFF);
}
