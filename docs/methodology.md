# Index methodology

[简体中文](methodology.zh-CN.md)

Animal and plant indices classify historical security names using separate rule files. They share market-data, eligibility, return, and state-management code. A thematic name match is separate from investable index eligibility.

## Rules and historical availability

`rules.yml` and `plant_rules.yml` define strict/extended keywords, `exclude_patterns`, and ts_code-only `force_include`/`force_exclude` lists. Extended matching includes strict keywords. Strict rules emphasize unambiguous real animal or plant names; extended rules can include ambiguous, collective, or mythical terms. Industry membership alone does not qualify a security whose name has no matching term.

Historical names use `namechange` as-of records. The provider paginates name history and supplements missing 2006 intervals. Unknown historical names cannot be replaced with the current `stock_basic.name`. `list_date`/`delist_date` filter the historical universe. ST, exchange, minimum listing age, and liquidity constraints further restrict eligibility.

| Configuration key | Meaning |
| --- | --- |
| `min_listing_days` | Minimum calendar days since listing; 0 disables the minimum |
| `min_daily_amount` | Minimum rebalance-day traded amount; 0 disables the threshold |
| `max_suspension_days` | Consecutive suspended trading days triggering removal; 0 disables it |

Rule versions use `effective_from` and the history files. Animal terms added on 2026-09-07 or 2026-09-25 do not enter earlier historical baskets. The earliest known animal rule date is 2025-12-22. Earlier replay reuses that known vocabulary as a retrospective assumption. The plant history preserves the 2026-09-05 vocabulary and applies the 2026-09-25 additions only from their effective date. A common 2021-01-04 chart origin does not establish that either vocabulary existed then.

## State and returns

The common origin is the close of 2021-01-04 with NAV 1. Initial holdings are selected at that close and returns begin on the next trading day. Baskets are recomputed on each month's first trading day, assigned equal fixed weights, and held between rebalances. The old basket earns the rebalance-day return; new weights start the following day.

Stock and ETF returns use the adjusted-price ratio:

```text
(close_t * adj_t) / (last_traded_close * last_traded_adj) - 1
```

Confirmed suspension keeps the holding and weight with zero daily return. Resumption realizes the adjusted-price change from the last valid observation. Other missing quotes keep the holding's weight and contribute zero rather than reallocating it. Missing delisting quotes have the separate strict/proxy boundary below. The stateless single-day helper has its own missing-price normalization and is not the stateful daily-index calculation.

Index return is the weighted sum of holding returns. Corporate-action adjustment factors approximate reinvested total returns; this is not explicit cash-dividend receipt, taxation, or reinvestment accounting. ETF calculation requires `fund_adj`; absent factors fail rather than becoming 1. Index benchmarks use `close / pre_close - 1` directly. Do not multiply already adjusted ETF `pre_close` by another adjustment ratio.

## Exceptional rebalance and delisting

A holding can trigger removal when delisted, in an announced/effective delisting period, newly ST, or suspended for the configured duration. That day still uses old holdings; the remaining basket is reweighted for the next trading day. Date-only announcements become available for decisions on the following day, and the monthly universe also excludes known delisting-period securities.

`--delisting-policy strict` is the CLI default. A missing delisting quote without verified settlement blocks calculation across that date. `last_price_proxy` is a research alternative: it uses the last valid adjusted valuation as a proxy, records zero return on the delisting day, and removes the holding. It marks metadata `evidence_tier=research_proxy`; that valuation is not verified cash settlement. [Architecture](architecture.md#deployment) records the actual scheduled policies for both gardens. See the [delisting contract](delisting-event-contract.md) and dated [formal diagnostic](formal-execution-diagnostic.md).

## Optional transaction-cost layer

`backtest.yml` defaults to `enabled: false` with zero `commission_rate`, `stamp_tax_rate`, and `slippage_rate`. Enabling it retains gross index returns and adds turnover, cost, net-return, and net-NAV fields to NAV and public snapshots.

The formal extra pins `quant-backtest-runtime` v4 and the `quant-platform` accounting provider. It requires Python 3.12+ and an external absolute `ZOO_BACKTEST_RUNTIME_ROOT` for job inputs, database, and outputs. Missing configuration rejects the run. Strict and extended rebalance settlement is submitted separately.

Before comparison with equal targets, previous weights drift with prices. Turnover is half the sum of absolute executed weight changes. Commission and slippage apply to executed changes; stamp tax applies to sells. Suspended securities cannot execute and remain pending. This cost layer does not by itself establish historical input availability or actual tradability.

## Name review and evidence

`zoo-audit` distinguishes thematic membership from index eligibility. Deterministic results can be reviewed with optional Gemini/OpenRouter model suggestions. Reports record input and rule hashes, provider/model identity, and prompt version. Model agreement only prioritizes review, and `confidence` is not a calibrated probability. Approve rules explicitly with an effective date; audit JSON does not directly become an index rule.

Dated [rule comparisons](rule-list-comparison-20260928.md) preserve their sample periods and withdrawn-performance limits. Synthetic contract tests verify engineering behavior, not historical returns. No real-data backfill or new numerical finding was produced by this documentation audit.
